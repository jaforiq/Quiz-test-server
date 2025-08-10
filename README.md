## existing
PORT=3000
MONGODB_URI=mongodb://127.0.0.1:27017/quiztest
CORS_ORIGIN=http://localhost:5173
ACCESS_TOKEN_SECRET=...
REFRESH_TOKEN_SECRET=...
ACCESS_TOKEN_TTL=3h
REFRESH_TOKEN_TTL=7d

## OTP + reset config
OTP_TTL_MINUTES=10
OTP_RESEND_COOLDOWN_SECONDS=60
RESET_TOKEN_TTL_MINUTES=30

## Nodemailer SMTP (use Mailtrap in dev or your SMTP)

SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=your_main
SMTP_PASS=google_account_generated_pass
SMTP_FROM="Quiztest <jaforiqbal5592@gmail.com>"
