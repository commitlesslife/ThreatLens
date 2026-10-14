import { Router, Request, Response } from "express";

export function createFixturePagesRouter(): Router {
  const router = Router();

  // 1. Scholarship Phish
  router.get("/scholarship", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>State University - Scholarship Disbursement Verification</title>
  <style>
    body { font-family: sans-serif; background: #f4f6f8; margin: 40px; }
    .card { background: white; padding: 24px; border-radius: 8px; max-width: 480px; margin: auto; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    h1 { color: #1e3a8a; font-size: 20px; }
    .field { margin-bottom: 16px; }
    label { display: block; font-weight: bold; margin-bottom: 4px; }
    input[type="text"], input[type="password"] { width: 100%; padding: 8px; box-sizing: border-box; }
    button { background: #2563eb; color: white; border: none; padding: 10px 16px; border-radius: 4px; cursor: pointer; }
    .synthetic-badge { font-size: 11px; background: #fef3c7; color: #92400e; padding: 2px 6px; border-radius: 4px; display: inline-block; margin-bottom: 12px; }
  </style>
</head>
<body>
  <div class="card">
    <span class="synthetic-badge">[CONTROLLED FIXTURE]</span>
    <h1>State University Scholarship Portal</h1>
    <p>Please re-authenticate your institutional account to release pending scholarship funds for this semester.</p>
    <form action="/receiver/canary" method="POST">
      <div class="field">
        <label for="student_id">Student ID / Institutional Email</label>
        <input type="text" id="student_id" name="username" required autocomplete="off" />
      </div>
      <div class="field">
        <label for="campus_password">Campus Password</label>
        <input type="password" id="campus_password" name="password" required autocomplete="off" />
      </div>
      <button type="submit" id="submit-btn">Verify Account</button>
    </form>
  </div>
</body>
</html>`);
  });

  // 2. Cloaked Portal (conditional content based on User-Agent)
  router.get("/cloaked", (req: Request, res: Response): void => {
    const userAgent = (req.headers["user-agent"] || "").toLowerCase();
    const isCrawler = /crawl|bot|spider|threatlenscrawler|curl|wget|slurp/i.test(userAgent);
    const isMobile = /mobile|iphone|ipod|android/i.test(userAgent);

    if (isCrawler) {
      res.status(403).setHeader("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en">
<head><title>Access Denied</title></head>
<body>
  <h1>403 Forbidden</h1>
  <p>Automated scanning and crawler tools are prohibited from accessing this resource.</p>
</body>
</html>`);
      return;
    }

    if (isMobile) {
      res.setHeader("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Urgent Student Alert - Mobile Verification</title>
  <style>
    body { font-family: sans-serif; background: #fff1f2; margin: 20px; }
    .card { background: white; padding: 20px; border-radius: 8px; border: 1px solid #fecdd3; }
    h2 { color: #9f1239; font-size: 18px; }
  </style>
</head>
<body>
  <div class="card">
    <h2>Action Required: Verify Student Account</h2>
    <p>Your student profile requires immediate phone and password re-verification.</p>
    <form action="/receiver/canary" method="POST">
      <input type="text" name="student_id" placeholder="Student ID" /><br/><br/>
      <input type="password" name="password" placeholder="Password" /><br/><br/>
      <input type="text" name="otp" placeholder="6-digit OTP" /><br/><br/>
      <button type="submit">Submit Verification</button>
    </form>
  </div>
</body>
</html>`);
      return;
    }

    // Default desktop response (benign maintenance notice)
    res.setHeader("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>System Maintenance - Student Portal</title>
</head>
<body>
  <div style="max-width: 600px; margin: 40px auto; font-family: sans-serif;">
    <h1>Portal Under Maintenance</h1>
    <p>The student portal is currently undergoing regular scheduled maintenance. Please check back later.</p>
  </div>
</body>
</html>`);
  });

  // 3. Benign Portal (clean university portal)
  router.get("/benign-portal", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Official University Student Portal</title>
</head>
<body style="font-family: sans-serif; margin: 40px;">
  <h1>Welcome to Official University Services</h1>
  <p>Campus announcements, library hours, and academic calendars are updated weekly.</p>
  <ul>
    <li>Campus Directory</li>
    <li>Library Catalog</li>
    <li>Academic Calendar</li>
  </ul>
</body>
</html>`);
  });

  // 4. Brand Clone (visual similarity)
  router.get("/brand-clone", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8").send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>State Federal Bank - Secure Login</title>
</head>
<body style="font-family: sans-serif; background: #002d62; color: white; padding: 40px;">
  <div style="background: white; color: #333; max-width: 400px; padding: 20px; border-radius: 4px; margin: auto;">
    <h2>State Federal Bank Online Access</h2>
    <p>Sign in to your online banking profile.</p>
    <form action="/receiver/canary" method="POST">
      <input type="text" name="account_number" placeholder="User ID / Account" /><br/><br/>
      <input type="password" name="password" placeholder="Passcode" /><br/><br/>
      <button type="submit">Sign In</button>
    </form>
  </div>
</body>
</html>`);
  });

  // 5. Synthetic Inbox (Simulated Webmail / Gmail-like Fixture)
  router.get("/synthetic-inbox", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Campus Webmail (Simulated Team Fixture)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #f1f3f4; margin: 0; padding: 20px; }
    .inbox-container { max-width: 900px; margin: 0 auto; background: white; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.12); overflow: hidden; }
    .inbox-header { background: #1a73e8; color: white; padding: 14px 20px; font-size: 18px; font-weight: 500; display: flex; justify-content: space-between; align-items: center; }
    .fixture-badge { background: #fef08a; color: #854d0e; font-size: 12px; padding: 4px 8px; border-radius: 4px; font-weight: bold; }
    .messages-list { padding: 16px; }
    .message-item { border: 1px solid #e0e0e0; border-radius: 6px; padding: 16px; margin-bottom: 12px; transition: border-color 0.2s; }
    .message-item.threatlens-highlight { border: 2px solid #ef4444; background: #fef2f2; }
    .message-meta { font-size: 13px; color: #5f6368; margin-bottom: 6px; }
    .message-subject { font-size: 16px; font-weight: 600; color: #202124; margin-bottom: 8px; }
    .message-body { font-size: 14px; color: #3c4043; line-height: 1.5; }
    .message-body a { color: #1a73e8; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="inbox-container" data-threatlens-container="inbox">
    <div class="inbox-header">
      <span>University Webmail — Active Messages</span>
      <span class="fixture-badge">[TEAM-OWNED SYNTHETIC FIXTURE]</span>
    </div>
    <div class="messages-list">
      <!-- Benign Message 1 -->
      <div class="message-item" id="msg-inbox-1" data-message-id="msg-inbox-1" data-sender="library-notices@university.test">
        <div class="message-meta">From: <strong>Library Circulation</strong> &lt;library-notices@university.test&gt; • Today, 10:15 AM</div>
        <div class="message-subject">Library Hold Notice: Computer Networks (4th Ed.)</div>
        <div class="message-body">
          Your reserved textbook 'Computer Networks' is ready for pickup at the Main Campus Library circulation desk. Holds expire in 5 business days. No login or confirmation is required.
        </div>
      </div>

      <!-- Suspicious Message 2 -->
      <div class="message-item" id="msg-inbox-2" data-message-id="msg-inbox-2" data-sender="disbursement-urgent@scholarship-alert.test">
        <div class="message-meta">From: <strong>Urgent Scholarship Processing</strong> &lt;disbursement-urgent@scholarship-alert.test&gt; • Today, 11:42 AM</div>
        <div class="message-subject">URGENT: Re-verify campus credentials to release pending scholarship funds</div>
        <div class="message-body">
          Action Required: Your student scholarship disbursement of $2,500 is pending. You must verify your institutional password and account details immediately to prevent cancellation. Click here to confirm your credentials:
          <a href="http://localhost:4001/fixtures/scholarship" class="threatlens-target-link">http://localhost:4001/fixtures/scholarship</a>
        </div>
      </div>

      <!-- Benign Message 3 -->
      <div class="message-item" id="msg-inbox-3" data-message-id="msg-inbox-3" data-sender="student-events@university.test">
        <div class="message-meta">From: <strong>Student Activities Board</strong> &lt;student-events@university.test&gt; • Yesterday, 4:00 PM</div>
        <div class="message-subject">Campus Spring Fest: Schedule and Map</div>
        <div class="message-body">
          Join us this Friday for the annual Campus Spring Fest. View event schedules and dining menus at our official portal:
          <a href="http://localhost:4001/fixtures/benign-portal">http://localhost:4001/fixtures/benign-portal</a>.
        </div>
      </div>
    </div>
  </div>
</body>
</html>`);
  });

  // 6. Synthetic Chat (Simulated WhatsApp/Slack-like Chat Thread)
  router.get("/synthetic-chat", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Campus Connect Chat (Simulated Team Fixture)</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #e5ddd5; margin: 0; padding: 20px; }
    .chat-container { max-width: 600px; margin: 0 auto; background: #efeae2; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.15); overflow: hidden; display: flex; flex-direction: column; height: 600px; }
    .chat-header { background: #075e54; color: white; padding: 14px 20px; font-size: 16px; font-weight: 500; display: flex; justify-content: space-between; align-items: center; }
    .fixture-badge { background: #fef08a; color: #854d0e; font-size: 11px; padding: 3px 6px; border-radius: 4px; font-weight: bold; }
    .chat-stream { padding: 16px; flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 12px; }
    .chat-bubble { max-width: 80%; padding: 10px 14px; border-radius: 8px; font-size: 14px; line-height: 1.4; box-shadow: 0 1px 0.5px rgba(0,0,0,0.13); position: relative; }
    .chat-bubble.threatlens-highlight { outline: 2px solid #ef4444; background: #fee2e2 !important; }
    .bubble-incoming { background: white; align-self: flex-start; }
    .bubble-outgoing { background: #dcf8c6; align-self: flex-end; }
    .bubble-sender { font-size: 12px; font-weight: bold; color: #128c7e; margin-bottom: 4px; }
    .bubble-time { font-size: 11px; color: #8696a0; text-align: right; margin-top: 4px; }
    .chat-bubble a { color: #027eb5; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="chat-container" data-threatlens-container="chat">
    <div class="chat-header">
      <span>Campus Engineering Group Chat</span>
      <span class="fixture-badge">[SYNTHETIC CHAT FIXTURE]</span>
    </div>
    <div class="chat-stream">
      <!-- Benign Message 1 -->
      <div class="chat-bubble bubble-incoming" id="msg-chat-1" data-message-id="msg-chat-1" data-sender="Alex Rivera">
        <div class="bubble-sender">Alex Rivera</div>
        <div class="bubble-text">Hey team, are we still meeting in lab 402 this afternoon to run the benchmarks?</div>
        <div class="bubble-time">14:05</div>
      </div>

      <!-- Suspicious Message 2 -->
      <div class="chat-bubble bubble-incoming" id="msg-chat-2" data-message-id="msg-chat-2" data-sender="IT Security Support">
        <div class="bubble-sender">IT Security Support</div>
        <div class="bubble-text">
          URGENT: Suspicious activity detected on your campus network ID. Re-verify your account credentials immediately or your account will be suspended within 2 hours:
          <a href="http://localhost:4001/fixtures/scholarship" class="threatlens-target-link">http://localhost:4001/fixtures/scholarship</a>
        </div>
        <div class="bubble-time">14:12</div>
      </div>

      <!-- Benign Message 3 -->
      <div class="chat-bubble bubble-outgoing" id="msg-chat-3" data-message-id="msg-chat-3" data-sender="You">
        <div class="bubble-sender">You</div>
        <div class="bubble-text">Thanks Alex, yes! Bringing my laptop now.</div>
        <div class="bubble-time">14:15</div>
      </div>
    </div>
  </div>
</body>
</html>`);
  });

  // 7. IT Helpdesk SSO Credential Harvesting Phish
  router.get("/credential-harvest", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Enterprise SSO - Account Security Re-verification</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: #0f172a; color: #f8fafc; margin: 0; padding: 40px 20px; }
    .card { background: #1e293b; max-width: 440px; margin: 0 auto; padding: 32px; border-radius: 12px; border: 1px solid #334155; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
    .badge { background: #dc2626; color: white; font-size: 11px; font-weight: bold; padding: 4px 8px; border-radius: 4px; display: inline-block; margin-bottom: 16px; text-transform: uppercase; letter-spacing: 0.5px; }
    h1 { font-size: 20px; margin: 0 0 12px; color: #f1f5f9; }
    p { font-size: 14px; color: #94a3b8; line-height: 1.5; margin-bottom: 24px; }
    .field { margin-bottom: 16px; }
    label { display: block; font-size: 13px; font-weight: 600; margin-bottom: 6px; color: #cbd5e1; }
    input { width: 100%; padding: 10px 12px; border-radius: 6px; border: 1px solid #475569; background: #0f172a; color: white; box-sizing: border-box; font-size: 14px; }
    button { width: 100%; background: #3b82f6; color: white; padding: 12px; border: none; border-radius: 6px; font-weight: 600; cursor: pointer; font-size: 14px; margin-top: 8px; }
    button:hover { background: #2563eb; }
  </style>
</head>
<body>
  <div class="card">
    <span class="badge">[SIMULATED ATTACK FIXTURE]</span>
    <h1>Single Sign-On Security Alert</h1>
    <p>Your institutional access token has expired due to abnormal login attempts. You must re-verify your campus credentials and 6-digit MFA passcode immediately to prevent account lockdown.</p>
    <form action="/receiver/canary" method="POST">
      <div class="field">
        <label for="uid">Institutional Username or Email</label>
        <input type="text" id="uid" name="username" placeholder="user@university.edu" required autocomplete="off" />
      </div>
      <div class="field">
        <label for="pw">Current Password</label>
        <input type="password" id="pw" name="password" placeholder="••••••••••••" required autocomplete="off" />
      </div>
      <div class="field">
        <label for="mfa">MFA / Authenticator 6-Digit Code</label>
        <input type="text" id="mfa" name="mfa_token" placeholder="000 000" maxlength="6" required autocomplete="off" />
      </div>
      <button type="submit">Verify &amp; Unlock Account</button>
    </form>
  </div>
</body>
</html>`);
  });

  // 8. Payment & Wire Fraud Scam
  router.get("/payment-fraud", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>OVERDUE NOTICE: Immediate Wire Transfer Required</title>
  <style>
    body { font-family: sans-serif; background: #fef2f2; margin: 0; padding: 40px 20px; }
    .container { max-width: 520px; margin: 0 auto; background: white; border: 2px solid #ef4444; border-radius: 8px; padding: 28px; box-shadow: 0 4px 6px rgba(0,0,0,0.05); }
    .urgent-banner { background: #ef4444; color: white; padding: 8px 12px; font-weight: bold; border-radius: 4px; text-align: center; margin-bottom: 20px; }
    h2 { color: #991b1b; margin-top: 0; }
    .invoice-details { background: #f8fafc; border: 1px solid #e2e8f0; padding: 12px; border-radius: 6px; font-family: monospace; font-size: 13px; margin-bottom: 20px; }
    input { width: 100%; padding: 8px; margin-bottom: 12px; box-sizing: border-box; }
    button { background: #dc2626; color: white; border: none; padding: 12px; font-weight: bold; width: 100%; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="container">
    <div class="urgent-banner">FINAL NOTICE: LEGAL PENALTIES IN 24 HOURS</div>
    <h2>Unpaid Vendor Invoice #INV-2026-8891</h2>
    <p>Your department has a past-due balance of <strong>$14,850.00 USD</strong>. Standard payment processing is currently suspended. Submit payment authorization immediately to avoid civil litigation.</p>
    <div class="invoice-details">
      <div>Payee: Global Equipment Logistics Ltd.</div>
      <div>Routing Code: 021000021</div>
      <div>Crypto Deposit: 0x71C...a891fB</div>
    </div>
    <form action="/receiver/canary" method="POST">
      <label>Authorized Financial Approver Name:</label>
      <input type="text" name="approver" required />
      <label>Department Account Number:</label>
      <input type="text" name="account" required />
      <label>Corporate Card / Wire Auth Token:</label>
      <input type="password" name="auth_token" required />
      <button type="submit">Authorize Emergency Settlement</button>
    </form>
  </div>
</body>
</html>`);
  });

  // 9. Fake Browser Security Patch Lure
  router.get("/fake-update", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Security Center - Critical Browser Patch Required</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #111827; color: white; margin: 0; padding: 60px 20px; text-align: center; }
    .box { max-width: 480px; margin: 0 auto; background: #1f2937; padding: 36px; border-radius: 12px; border: 1px solid #374151; }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 22px; color: #f87171; margin-bottom: 12px; }
    p { color: #9ca3af; font-size: 14px; line-height: 1.6; margin-bottom: 24px; }
    .btn-download { display: inline-block; background: #ef4444; color: white; padding: 14px 28px; border-radius: 6px; font-weight: bold; text-decoration: none; font-size: 15px; }
  </style>
</head>
<body>
  <div class="box">
    <div class="icon">⚠️</div>
    <h1>Critical Security Alert: Zero-Day Detected</h1>
    <p>Your browser version is vulnerable to an active remote code execution exploit (CVE-2026-9812). Security policy requires immediate application of the system security hotfix patch.</p>
    <a href="/receiver/canary?action=fake_update_download" class="btn-download">Download Security Hotfix (.exe)</a>
  </div>
</body>
</html>`);
  });

  // 10. Gift Card / Reward Scam
  router.get("/gift-card-scam", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Student Rewards Portal - Claim $500 Gift Voucher</title>
  <style>
    body { font-family: sans-serif; background: #f0fdf4; margin: 0; padding: 40px 20px; }
    .reward-card { max-width: 460px; margin: 0 auto; background: white; border: 2px solid #22c55e; border-radius: 12px; padding: 28px; text-align: center; }
    h1 { color: #15803d; font-size: 22px; }
    .voucher-value { font-size: 36px; font-weight: bold; color: #16a34a; margin: 12px 0; }
    input { width: 100%; padding: 10px; margin: 8px 0 16px; box-sizing: border-box; border: 1px solid #cbd5e1; border-radius: 6px; }
    button { width: 100%; background: #16a34a; color: white; padding: 12px; border: none; border-radius: 6px; font-size: 16px; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <div class="reward-card">
    <h1>Congratulations Student!</h1>
    <p>You have been randomly selected in this semester's technology grant drawing:</p>
    <div class="voucher-value">$500.00 Visa Voucher</div>
    <p style="font-size: 13px; color: #64748b;">Confirm your student identity and personal PIN to release the digital claim code.</p>
    <form action="/receiver/canary" method="POST" style="text-align: left;">
      <label>Full Student Name:</label>
      <input type="text" name="name" required />
      <label>University Email ID:</label>
      <input type="email" name="email" required />
      <label>Social Security / National ID (Last 4 Digits):</label>
      <input type="password" name="ssn_last4" maxlength="4" required />
      <label>4-Digit Debit / Mobile PIN:</label>
      <input type="password" name="pin" maxlength="4" required />
      <button type="submit">Claim $500 Voucher Now</button>
    </form>
  </div>
</body>
</html>`);
  });

  // 11. 2FA QR Code Phishing
  router.get("/qr-phish", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Authenticator Setup - University 2FA Sync</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #f8fafc; margin: 0; padding: 40px 20px; }
    .qr-card { max-width: 440px; margin: 0 auto; background: white; padding: 32px; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.06); text-align: center; }
    .qr-placeholder { width: 160px; height: 160px; margin: 20px auto; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-family: monospace; font-size: 12px; border: 2px dashed #94a3b8; }
    input { width: 100%; padding: 10px; margin: 8px 0 16px; box-sizing: border-box; text-align: center; font-size: 18px; letter-spacing: 4px; }
    button { width: 100%; background: #0284c7; color: white; padding: 12px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; }
  </style>
</head>
<body>
  <div class="qr-card">
    <h2>Re-sync Your Multi-Factor Authenticator</h2>
    <p style="font-size: 14px; color: #64748b;">University IT is upgrading authentication servers. Scan the code below with your Google Authenticator or Duo Mobile app:</p>
    <div class="qr-placeholder">[FAKE 2FA QR CODE]</div>
    <form action="/receiver/canary" method="POST">
      <label style="font-size: 13px; font-weight: 600;">Enter the 6-digit code shown on your phone:</label>
      <input type="text" name="mfa_seed_code" maxlength="6" placeholder="123456" required />
      <button type="submit">Verify &amp; Confirm Device</button>
    </form>
  </div>
</body>
</html>`);
  });

  // 12. Executive Whaling / CEO Memo
  router.get("/ceo-fraud", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Confidential Office of the Chancellor Memo</title>
  <style>
    body { font-family: Georgia, serif; background: #fdfbf7; margin: 40px 20px; color: #1c1917; }
    .memo { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border: 1px solid #e7e5e4; box-shadow: 0 2px 4px rgba(0,0,0,0.05); }
    .header { border-bottom: 2px solid #78350f; padding-bottom: 16px; margin-bottom: 24px; }
    .confidential { color: #b91c1c; font-weight: bold; font-family: sans-serif; font-size: 13px; letter-spacing: 1px; }
    p { line-height: 1.7; font-size: 15px; }
  </style>
</head>
<body>
  <div class="memo">
    <div class="header">
      <span class="confidential">RESTRICTED &amp; CONFIDENTIAL</span>
      <h2>Office of the Chancellor — Priority Request</h2>
    </div>
    <p>Good morning,</p>
    <p>I am currently tied up in an unscheduled emergency meeting with the board of trustees and unable to take incoming voice calls. I need you to handle an urgent confidential task for our keynote speakers immediately.</p>
    <p>Please reply with your personal cell phone number right away so I can send the vendor gift card authorization instructions directly via SMS text message.</p>
    <form action="/receiver/canary" method="POST" style="margin-top: 24px; font-family: sans-serif;">
      <label style="display:block; font-weight:bold; margin-bottom:6px;">Your Direct Mobile Phone Number:</label>
      <input type="tel" name="cell_phone" placeholder="+1 (555) 000-0000" style="width:100%; padding:8px; margin-bottom:12px; box-sizing:border-box;" required />
      <button type="submit" style="background:#78350f; color:white; border:none; padding:10px 18px; border-radius:4px; cursor:pointer;">Acknowledge Chancellor's Request</button>
    </form>
  </div>
</body>
</html>`);
  });

  // 13. Brand Clone - Apex Financial Portal
  router.get("/brand-clone-apex", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Apex Financial Services - Client Portal</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #0a192f; color: #ccd6f6; margin: 0; padding: 40px 20px; }
    .portal-card { max-width: 420px; margin: 0 auto; background: #112240; border-radius: 8px; border: 1px solid #233554; padding: 32px; }
    .brand-title { color: #64ffda; font-size: 22px; font-weight: bold; margin-bottom: 8px; }
    input { width: 100%; padding: 10px; margin: 8px 0 16px; background: #0a192f; border: 1px solid #233554; color: white; border-radius: 4px; box-sizing: border-box; }
    button { width: 100%; background: #64ffda; color: #0a192f; font-weight: bold; padding: 12px; border: none; border-radius: 4px; cursor: pointer; }
  </style>
</head>
<body>
  <div class="portal-card">
    <div class="brand-title">Apex Financial</div>
    <p style="font-size: 14px; color: #8892b0;">Wealth Management &amp; Institutional Banking Access</p>
    <form action="/receiver/canary" method="POST">
      <label style="font-size:13px;">Corporate Client ID:</label>
      <input type="text" name="client_id" required />
      <label style="font-size:13px;">Access Passcode:</label>
      <input type="password" name="passcode" required />
      <button type="submit">Sign In to Apex Portal</button>
    </form>
  </div>
</body>
</html>`);
  });

  // 14. Benign Research Lab Portal (Clean Control)
  router.get("/benign-research", (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Systems &amp; Cybersecurity Research Laboratory</title>
  <style>
    body { font-family: -apple-system, sans-serif; background: #f8fafc; color: #1e293b; margin: 0; padding: 40px 20px; line-height: 1.6; }
    .content { max-width: 760px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    h1 { color: #0f172a; margin-top: 0; }
    ul { padding-left: 20px; }
    li { margin-bottom: 8px; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="content">
    <h1>Systems &amp; Cybersecurity Research Group</h1>
    <p>Welcome to the official university systems research laboratory. Our group conducts empirical security evaluations of web applications, browser sandbox architectures, and automated threat investigation pipelines.</p>
    <h2>Recent Publications</h2>
    <ul>
      <li><strong>Evidence-Backed Investigation of Cloaked Phishing Lures</strong> — IEEE S&amp;P 2026.</li>
      <li><strong>Defending Browser Extension Workspaces against Arbitrary Content Poisoning</strong> — USENIX Security 2025.</li>
    </ul>
    <h2>Weekly Reading Group</h2>
    <p>Seminars are held Fridays at 2:00 PM in Computer Science Hall 304. Open to all students and faculty.</p>
  </div>
</body>
</html>`);
  });

  // 15. ThreatLab Interactive Sample Directory
  router.get(["/", "/samples"], (_req: Request, res: Response): void => {
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>ThreatLens Security Detector — Test Fixture Lab</title>
  <style>
    :root { --bg: #090d16; --card-bg: #111827; --border: #1f2937; --text: #f3f4f6; --text-muted: #9ca3af; --accent: #3b82f6; --red: #ef4444; --green: #10b981; --amber: #f59e0b; }
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; background: var(--bg); color: var(--text); margin: 0; padding: 40px 24px; }
    .header { max-width: 1100px; margin: 0 auto 36px; text-align: center; }
    .header h1 { font-size: 28px; margin: 0 0 10px; font-weight: 700; }
    .header p { color: var(--text-muted); font-size: 15px; max-width: 680px; margin: 0 auto; }
    .badge { display: inline-block; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; text-transform: uppercase; margin-bottom: 12px; }
    .badge-red { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.3); }
    .badge-amber { background: rgba(245, 158, 11, 0.15); color: #fbbf24; border: 1px solid rgba(245, 158, 11, 0.3); }
    .badge-green { background: rgba(16, 185, 129, 0.15); color: #34d399; border: 1px solid rgba(16, 185, 129, 0.3); }
    .grid { max-width: 1100px; margin: 0 auto; display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 20px; }
    .card { background: var(--card-bg); border: 1px solid var(--border); border-radius: 10px; padding: 20px; display: flex; flex-direction: column; justify-content: space-between; transition: transform 0.15s, border-color 0.15s; }
    .card:hover { border-color: #374151; transform: translateY(-2px); }
    .card-title { font-size: 17px; font-weight: 600; margin: 0 0 8px; color: #fff; }
    .card-desc { font-size: 13px; color: var(--text-muted); line-height: 1.5; margin: 0 0 16px; flex: 1; }
    .tag-list { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 16px; }
    .tag { font-size: 11px; background: #1f2937; color: #94a3b8; padding: 2px 8px; border-radius: 4px; font-family: monospace; }
    .actions { display: flex; gap: 10px; }
    .btn { flex: 1; padding: 8px 12px; font-size: 12px; font-weight: 600; text-align: center; border-radius: 6px; text-decoration: none; cursor: pointer; transition: all 0.15s; }
    .btn-primary { background: #2563eb; color: white; border: none; }
    .btn-primary:hover { background: #1d4ed8; }
    .btn-secondary { background: #1f2937; color: #e5e7eb; border: 1px solid #374151; }
    .btn-secondary:hover { background: #374151; }
  </style>
</head>
<body>
  <div class="header">
    <div class="badge badge-amber">ThreatLens Lab Fixtures</div>
    <h1>Cybersecurity Detector Test Suite</h1>
    <p>Comprehensive library of team-owned test fixtures designed to rigorously evaluate on-device Chrome extension scanning, anti-crawler cloaking detection, brand canonical verification, and passive sandbox analysis.</p>
  </div>

  <div class="grid">
    <!-- 1. Scholarship Phish -->
    <div class="card">
      <div>
        <span class="badge badge-red">Credential Phish</span>
        <div class="card-title">Scholarship Credential Harvester</div>
        <div class="card-desc">Simulates a deceptive university scholarship verification form demanding student credentials.</div>
        <div class="tag-list">
          <span class="tag">password_form</span>
          <span class="tag">student_id</span>
          <span class="tag">urgency_lure</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/scholarship" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/scholarship" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 2. Cloaked Anti-Bot -->
    <div class="card">
      <div>
        <span class="badge badge-red">Cloaking Evasion</span>
        <div class="card-title">Anti-Crawl Cloaking Portal</div>
        <div class="card-desc">Returns 403 to automated crawlers, but serves an urgent credential + OTP form to mobile user-agents.</div>
        <div class="tag-list">
          <span class="tag">403_bot_evasion</span>
          <span class="tag">mobile_otp_phish</span>
          <span class="tag">discrepancy</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/cloaked" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/cloaked" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 3. State Bank Brand Clone -->
    <div class="card">
      <div>
        <span class="badge badge-red">Brand Impersonation</span>
        <div class="card-title">State Federal Bank Clone</div>
        <div class="card-desc">Replicates bank color scheme and login interface on an unauthorized host to test brand discrepancy detection.</div>
        <div class="tag-list">
          <span class="tag">brand_spoof</span>
          <span class="tag">banking_login</span>
          <span class="tag">visual_clone</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/brand-clone" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/brand-clone" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 4. Apex Financial Brand Clone -->
    <div class="card">
      <div>
        <span class="badge badge-red">Brand Impersonation</span>
        <div class="card-title">Apex Financial Services Clone</div>
        <div class="card-desc">Impersonates Apex Financial's client login portal on an unauthorized test domain.</div>
        <div class="tag-list">
          <span class="tag">apex_financial</span>
          <span class="tag">wealth_phish</span>
          <span class="tag">domain_discrepancy</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/brand-clone-apex" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/brand-clone-apex" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 5. IT Helpdesk SSO Harvest -->
    <div class="card">
      <div>
        <span class="badge badge-red">MFA Phishing</span>
        <div class="card-title">IT Helpdesk SSO Verification</div>
        <div class="card-desc">Deceptive corporate Single Sign-On demanding password and 6-digit MFA authenticator token.</div>
        <div class="tag-list">
          <span class="tag">sso_phish</span>
          <span class="tag">mfa_token_theft</span>
          <span class="tag">account_lockdown</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/credential-harvest" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/credential-harvest" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 6. Payment & Wire Fraud -->
    <div class="card">
      <div>
        <span class="badge badge-red">Financial Scam</span>
        <div class="card-title">Urgent Wire &amp; Invoice Fraud</div>
        <div class="card-desc">High-pressure past-due penalty invoice with crypto wallet address and corporate wire token lure.</div>
        <div class="tag-list">
          <span class="tag">wire_fraud</span>
          <span class="tag">invoice_scam</span>
          <span class="tag">urgency_pressure</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/payment-fraud" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/payment-fraud" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 7. Fake Browser Update -->
    <div class="card">
      <div>
        <span class="badge badge-red">Drive-by Lure</span>
        <div class="card-title">Critical Security Update Lure</div>
        <div class="card-desc">Fake zero-day vulnerability warning prompting immediate download of an executable security patch.</div>
        <div class="tag-list">
          <span class="tag">fake_update</span>
          <span class="tag">malware_lure</span>
          <span class="tag">cve_warning</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/fake-update" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/fake-update" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 8. Gift Card / Reward Scam -->
    <div class="card">
      <div>
        <span class="badge badge-amber">Reward Scam</span>
        <div class="card-title">$500 Reward Voucher Scam</div>
        <div class="card-desc">Prize lottery lure demanding student name, SSN last 4, and 4-digit banking PIN to claim rewards.</div>
        <div class="tag-list">
          <span class="tag">lottery_scam</span>
          <span class="tag">pin_harvest</span>
          <span class="tag">identity_theft</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/gift-card-scam" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/gift-card-scam" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 9. 2FA QR Phish -->
    <div class="card">
      <div>
        <span class="badge badge-red">Quishing</span>
        <div class="card-title">2FA QR Code Sync Phish</div>
        <div class="card-desc">Deceptive QR code claiming to re-synchronize university two-factor authentication tokens.</div>
        <div class="tag-list">
          <span class="tag">qr_phish</span>
          <span class="tag">2fa_bypass</span>
          <span class="tag">seed_capture</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/qr-phish" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/qr-phish" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 10. Executive Whaling -->
    <div class="card">
      <div>
        <span class="badge badge-amber">Whaling</span>
        <div class="card-title">Executive Whaling Memo</div>
        <div class="card-desc">Impersonates the University Chancellor requesting immediate confidential phone contact and gift card purchase.</div>
        <div class="tag-list">
          <span class="tag">executive_memo</span>
          <span class="tag">social_engineering</span>
          <span class="tag">chancellor_spoof</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/ceo-fraud" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/ceo-fraud" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 11. Synthetic Inbox -->
    <div class="card">
      <div>
        <span class="badge badge-amber">In-Context Webmail</span>
        <div class="card-title">Synthetic Webmail Inbox</div>
        <div class="card-desc">Full simulated inbox with benign campus notices and an urgent scholarship phishing email. Perfect for Chrome extension demo.</div>
        <div class="tag-list">
          <span class="tag">extension_inbox</span>
          <span class="tag">visible_messages</span>
          <span class="tag">sidepanel_scan</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/synthetic-inbox" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/synthetic-inbox" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 12. Synthetic Chat -->
    <div class="card">
      <div>
        <span class="badge badge-amber">In-Context Chat</span>
        <div class="card-title">Synthetic Group Chat</div>
        <div class="card-desc">Simulated WhatsApp / Slack thread with peer messages and an urgent IT security account suspension alert.</div>
        <div class="tag-list">
          <span class="tag">extension_chat</span>
          <span class="tag">chat_bubbles</span>
          <span class="tag">suspicious_link</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/synthetic-chat" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/synthetic-chat" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 13. Benign Student Portal -->
    <div class="card">
      <div>
        <span class="badge badge-green">Safe Control</span>
        <div class="card-title">Official Student Portal</div>
        <div class="card-desc">Legitimate university portal with clean institutional links and expected user flow. Zero threats.</div>
        <div class="tag-list">
          <span class="tag">benign</span>
          <span class="tag">expected_flow</span>
          <span class="tag">clean_domain</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/benign-portal" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/benign-portal" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>

    <!-- 14. Benign Research Lab -->
    <div class="card">
      <div>
        <span class="badge badge-green">Safe Control</span>
        <div class="card-title">Academic Research Lab</div>
        <div class="card-desc">Faculty publication directory with scholarly papers, verified external academic links, and seminar dates.</div>
        <div class="tag-list">
          <span class="tag">benign</span>
          <span class="tag">academic</span>
          <span class="tag">zero_threat</span>
        </div>
      </div>
      <div class="actions">
        <a href="/fixtures/benign-research" target="_blank" class="btn btn-secondary">Open Fixture</a>
        <a href="http://localhost:3000/?target=http://localhost:4001/fixtures/benign-research" target="_blank" class="btn btn-primary">Analyze in Web UI</a>
      </div>
    </div>
  </div>
</body>
</html>`);
  });

  return router;
}
