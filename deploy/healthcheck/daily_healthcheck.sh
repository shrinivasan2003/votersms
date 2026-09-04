#!/bin/bash
# Daily health check for votersms: frontend, backend, database, and server
# resources. Emails a report via Postmark's API directly (NOT through the
# app itself) so a report still goes out even if the backend is down.
#
# IMPORTANT LIMITATION: this runs ON this VM via a systemd timer/cron.
# If the whole VM goes down (the exact failure this was built in response
# to), this script cannot run and no report will be sent — silence is not
# the same as "all clear" for that failure mode. This only complements,
# it does not replace, an external uptime monitor (e.g. UptimeRobot,
# DigitalOcean Monitoring) that pings the site from outside this server.
#
# Usage: bash daily_healthcheck.sh
set -uo pipefail   # not -e: we want to keep checking even if one check fails

APP_DIR="/opt/votersms/python_server"
DOMAIN="outreach.ballotda.com"
ALERT_EMAIL="naveenk@ballotda.com"

envval() {
    grep -m1 "^$1=" "$APP_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'" \
        | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}
POSTMARK_API_KEY=$(envval POSTMARK_API_KEY)
SENDER_EMAIL=$(envval POSTMARK_SENDER_EMAIL)

REPORT=""
OVERALL_OK=1
add() { REPORT="${REPORT}$1
"; }

add "VoterSMS Daily Health Check — $(date -u '+%Y-%m-%d %H:%M UTC')"
add "================================================================"
add ""

# ── Frontend ──────────────────────────────────────────────────────────────
FRONTEND_CODE=$(curl -s -o /dev/null -m 10 -w "%{http_code}" "https://${DOMAIN}/")
if [[ "$FRONTEND_CODE" == "200" ]]; then
    add "✅ Frontend: OK (HTTP $FRONTEND_CODE)"
else
    add "❌ Frontend: FAILED (HTTP $FRONTEND_CODE)"
    OVERALL_OK=0
fi

# ── Backend + Database (via /api/health) ────────────────────────────────
HEALTH_RESPONSE=$(curl -s -m 10 -w "\n%{http_code}" "https://${DOMAIN}/api/health")
HEALTH_CODE=$(echo "$HEALTH_RESPONSE" | tail -1)
HEALTH_BODY=$(echo "$HEALTH_RESPONSE" | sed '$d')
if [[ "$HEALTH_CODE" == "200" ]]; then
    add "✅ Backend + Database: OK"
else
    add "❌ Backend + Database: FAILED (HTTP $HEALTH_CODE) — $HEALTH_BODY"
    OVERALL_OK=0
fi

# ── SSL certificate expiry ───────────────────────────────────────────────
CERT_END=$(echo | openssl s_client -connect "${DOMAIN}:443" -servername "$DOMAIN" 2>/dev/null | openssl x509 -noout -enddate 2>/dev/null | cut -d= -f2)
if [[ -n "$CERT_END" ]]; then
    DAYS_LEFT=$(( ($(date -d "$CERT_END" +%s) - $(date +%s)) / 86400 ))
    if [[ $DAYS_LEFT -lt 14 ]]; then
        add "⚠️  SSL certificate: expires in $DAYS_LEFT days ($CERT_END)"
        OVERALL_OK=0
    else
        add "✅ SSL certificate: OK (expires in $DAYS_LEFT days)"
    fi
else
    add "⚠️  SSL certificate: could not check"
fi

# ── systemd services ──────────────────────────────────────────────────────
for svc in votersms nginx mariadb; do
    if systemctl is-active --quiet "$svc"; then
        add "✅ Service $svc: running"
    else
        add "❌ Service $svc: NOT running"
        OVERALL_OK=0
    fi
done

# ── Disk space ────────────────────────────────────────────────────────────
DISK_PCT=$(df / --output=pcent | tail -1 | tr -dc '0-9')
if [[ "$DISK_PCT" -ge 85 ]]; then
    add "⚠️  Disk usage: ${DISK_PCT}% full"
    OVERALL_OK=0
else
    add "✅ Disk usage: ${DISK_PCT}% full"
fi

add ""
if [[ $OVERALL_OK -eq 1 ]]; then
    add "Overall: ALL SYSTEMS OK"
    SUBJECT="✅ VoterSMS Daily Health Check — All OK"
else
    add "Overall: ATTENTION NEEDED — see failures above"
    SUBJECT="⚠️ VoterSMS Daily Health Check — Action Needed"
fi

# ── Send via Postmark API directly (independent of the app) ─────────────
if [[ -z "$POSTMARK_API_KEY" ]]; then
    echo "POSTMARK_API_KEY not set — cannot send report. Report was:"
    echo "$REPORT"
    exit 1
fi

BODY_ESCAPED=$(echo "$REPORT" | python3 -c 'import json,sys; print(json.dumps(sys.stdin.read()))')

curl -s -X POST "https://api.postmarkapp.com/email" \
    -H "Accept: application/json" \
    -H "Content-Type: application/json" \
    -H "X-Postmark-Server-Token: ${POSTMARK_API_KEY}" \
    -d "{\"From\":\"${SENDER_EMAIL}\",\"To\":\"${ALERT_EMAIL}\",\"Subject\":\"${SUBJECT}\",\"TextBody\":${BODY_ESCAPED}}" \
    -o /dev/null -w "Postmark send: HTTP %{http_code}\n"

echo "$REPORT"
