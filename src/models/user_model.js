const {Schema,model} = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new Schema(
  {
    // 🔹 Basic Info
    name: {
      type: String,
      required: true,
      trim: true
    },

    email: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true
    },

    phone: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      trim: true
    },

    // 🔹 Password (only for manual login)
    password: {
      type: String,
      default: null
    },

    // 🔹 Google Auth
    picture: {
      type: String,
      default: null
    },

    provider: {
      type: String,
      enum: ["local", "google", "github", "phone"],
      default: "local"
    },

    githubId: {
      type: String,
      default: null,
      index: true
    },

    verified: {
      type: Boolean,
      default: false
    },

    // 🔹 Role (for future scaling)
    role: {
      type: String,
      enum: ["user", "admin"],
      default: "user"
    },

    // 🔹 Subscription
    isPremium: {
      type: Boolean,
      default: false
    },

    // 🔹 Activity tracking
    lastLogin: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true // createdAt, updatedAt
  }
);

userSchema.pre("save", async function () {
  if (!this.isModified("password") || !this.password) return;

  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.comparePassword = function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};


module.exports = model("User", userSchema);