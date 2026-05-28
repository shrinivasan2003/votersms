import os
import httpx


def _app_url() -> str:
    return os.getenv("APP_URL", "http://localhost:5173").rstrip("/")


def send_welcome_email(to_email: str, username: str, password: str, customer_name: str) -> bool:
    """Send a welcome email via Postmark. Returns True on success."""
    api_key = os.getenv("POSTMARK_API_KEY", "")
    if not api_key or api_key == "POSTMARK_API_KEY_HERE":
        return False

    sender_email = os.getenv("POSTMARK_SENDER_EMAIL", "noreply@ballotda.com")
    sender_name  = os.getenv("POSTMARK_SENDER_NAME",  "BallotDA")

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 30px; margin: 0;">
      <div style="max-width: 560px; margin: auto; background: #fff; border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden;">
        <div style="background: #001F3F; padding: 32px 40px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700;">Welcome to BallotDA</h1>
          <p style="color: #93c5fd; margin: 8px 0 0; font-size: 14px;">Civic Engagement Portal</p>
        </div>
        <div style="padding: 40px;">
          <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">
            Hi there! Your customer account for <strong>{customer_name}</strong> has been set up.
            Here are your login credentials:
          </p>
          <div style="background: #f1f5f9; border-radius: 8px; padding: 20px 24px; margin: 0 0 24px;">
            <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Username</p>
            <p style="margin: 0 0 16px; color: #0f172a; font-size: 18px; font-weight: 700;">{username}</p>
            <p style="margin: 0 0 4px; color: #64748b; font-size: 12px; font-weight: 600; text-transform: uppercase;">Password</p>
            <p style="margin: 0; color: #0f172a; font-size: 18px; font-weight: 700;">{password}</p>
          </div>
          <p style="color: #6b7280; font-size: 14px; margin: 0 0 24px;">
            Please change your password after your first login for security.
          </p>
          <a href="{_app_url()}/login" style="display: inline-block; background: #001F3F; color: #fff;
             text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700;
             font-size: 15px;">Login to BallotDA</a>
        </div>
        <div style="background: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            &copy; 2026 BallotDA Enterprise. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    try:
        resp = httpx.post(
            "https://api.postmarkapp.com/email",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Postmark-Server-Token": api_key,
            },
            json={
                "From": f"{sender_name} <{sender_email}>",
                "To": to_email,
                "Subject": "Welcome to BallotDA — Your account is ready",
                "HtmlBody": html_body,
                "MessageStream": "outbound",
            },
            timeout=10,
        )
        return resp.status_code == 200
    except Exception:
        return False


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """Send a password-reset link via Postmark. Returns True on success."""
    api_key = os.getenv("POSTMARK_API_KEY", "")
    if not api_key or api_key == "POSTMARK_API_KEY_HERE":
        return False

    sender_email = os.getenv("POSTMARK_SENDER_EMAIL", "noreply@ballotda.com")
    sender_name  = os.getenv("POSTMARK_SENDER_NAME",  "BallotDA")
    reset_url    = f"{_app_url()}/reset-password?token={reset_token}"

    html_body = f"""
    <html>
    <body style="font-family: Arial, sans-serif; background: #f8fafc; padding: 30px; margin: 0;">
      <div style="max-width: 560px; margin: auto; background: #fff; border-radius: 12px;
                  box-shadow: 0 4px 20px rgba(0,0,0,0.06); overflow: hidden;">
        <div style="background: #001F3F; padding: 32px 40px; text-align: center;">
          <h1 style="color: #fff; margin: 0; font-size: 24px; font-weight: 700;">Reset Your Password</h1>
          <p style="color: #93c5fd; margin: 8px 0 0; font-size: 14px;">BallotDA Civic Engagement Portal</p>
        </div>
        <div style="padding: 40px;">
          <p style="color: #374151; font-size: 16px; margin: 0 0 20px;">
            We received a request to reset your password. Click the button below to choose a new one.
            This link expires in <strong>1 hour</strong>.
          </p>
          <a href="{reset_url}" style="display: inline-block; background: #001F3F; color: #fff;
             text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700;
             font-size: 15px;">Reset Password</a>
          <p style="color: #9ca3af; font-size: 13px; margin: 24px 0 0;">
            If you didn't request a password reset, you can safely ignore this email.
          </p>
        </div>
        <div style="background: #f8fafc; padding: 20px 40px; text-align: center; border-top: 1px solid #e2e8f0;">
          <p style="color: #94a3b8; font-size: 12px; margin: 0;">
            &copy; 2026 BallotDA Enterprise. All rights reserved.
          </p>
        </div>
      </div>
    </body>
    </html>
    """

    try:
        resp = httpx.post(
            "https://api.postmarkapp.com/email",
            headers={
                "Accept": "application/json",
                "Content-Type": "application/json",
                "X-Postmark-Server-Token": api_key,
            },
            json={
                "From": f"{sender_name} <{sender_email}>",
                "To": to_email,
                "Subject": "Reset your BallotDA password",
                "HtmlBody": html_body,
                "MessageStream": "outbound",
            },
            timeout=10,
        )
        return resp.status_code == 200
    except Exception:
        return False
