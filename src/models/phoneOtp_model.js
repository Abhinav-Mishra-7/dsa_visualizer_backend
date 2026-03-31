const { Schema, model } = require("mongoose");

const phoneOtpSchema = new Schema(
  {
    phone: { type: String, required: true, index: true },
    otpHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    consumedAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// Automatically delete expired OTP docs (Mongo TTL index)
phoneOtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = model("PhoneOtp", phoneOtpSchema);

