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
ALERT_EMAIL="naveenk@ballotda.com,shobana@sonline.us"

envval() {
    grep -m1 "^$1=" "$APP_DIR/.env" | cut -d'=' -f2- | tr -d '"' | tr -d "'" \
        | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//'
}
POSTMARK_API_KEY=$(envval POSTMARK_API_KEY)
SENDER_EMAIL=$(envval POSTMARK_SENDER_EMAIL)
DB_USER=$(envval DB_USER)
DB_PASS=$(envval DB_PASS)
DB_NAME=$(envval DB_NAME)

REPORT=""
OVERALL_OK=1
FRONTEND_OK=0
BACKEND_OK=0
SERVICES_OK=1
DAYS_LEFT=""
DISK_PCT=""
add() { REPORT="${REPORT}$1
"; }

add "VoterSMS (Outreach Platform) — Daily Health Check"
add "$(date -u '+%Y-%m-%d %H:%M UTC')"
add "================================================================"
add ""
add "This automated check was configured by Naveen (Developer) to give"
add "the admin team direct visibility into the platform's health — no"
add "manual login or server access required, delivered straight to your"
add "inbox each morning."
add ""

# ── Frontend ──────────────────────────────────────────────────────────────
FRONTEND_CODE=$(curl -s -o /dev/null -m 10 -w "%{http_code}" "https://${DOMAIN}/")
if [[ "$FRONTEND_CODE" == "200" ]]; then
    add "✅ Frontend: OK (HTTP $FRONTEND_CODE)"
    FRONTEND_OK=1
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
    BACKEND_OK=1
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
        SERVICES_OK=0
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

# ── Save to the database, for the Super Admin > Health dashboard page ───
# Inserted via the app's own venv (pymysql), independent of whether the
# app process itself is healthy right now — same reasoning as sending
# via Postmark's API directly rather than through the app. Uses a real
# parameterized query rather than hand-built SQL strings, so the report
# text (which can contain quotes, backslashes, emoji) is always safe.
if [[ -n "$DB_PASS" ]]; then
    "$APP_DIR/.venv/bin/python3" -c "
import sys, pymysql
db_user, db_pass, db_name, overall_ok, frontend_ok, backend_ok, services_ok, days_left, disk_pct, report = sys.argv[1:]
conn = pymysql.connect(host='localhost', user=db_user, password=db_pass, database=db_name, charset='utf8mb4')
try:
    with conn.cursor() as cur:
        cur.execute(
            'INSERT INTO health_check_reports '
            '(checked_at, overall_ok, frontend_ok, backend_ok, services_ok, ssl_days_left, disk_pct, report_text) '
            'VALUES (UTC_TIMESTAMP(), %s, %s, %s, %s, %s, %s, %s)',
            (overall_ok, frontend_ok, backend_ok, services_ok, days_left or None, disk_pct or None, report),
        )
    conn.commit()
    print('health_check_reports: saved')
except Exception as e:
    print(f'health_check_reports: insert failed: {e}')
finally:
    conn.close()
" "$DB_USER" "$DB_PASS" "$DB_NAME" "$OVERALL_OK" "$FRONTEND_OK" "$BACKEND_OK" "$SERVICES_OK" "${DAYS_LEFT:-}" "${DISK_PCT:-}" "$REPORT"
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
