import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 32,
    },
    fullName: {
      type: String,
      trim: true,
      maxlength: 128,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    avatarUrl: String,
    bio: {
      type: String,
      maxlength: 512,
    },
    role: {
      type: String,
      enum: ['user', 'pro', 'admin'],
      default: 'user',
    },

    // GitHub OAuth
    githubId: {
      type: String,
      sparse: true,
      unique: true,
    },
    githubToken: {
      type: String,
      select: false,
    },
    githubUsername: String,

    // Usage
    docsGenerated: { type: Number, default: 0 },
    reposConnected: { type: Number, default: 0 },
    apiCallsToday: { type: Number, default: 0 },
    lastApiReset: { type: Date, default: Date.now },

    isActive: { type: Boolean, default: true },
    emailVerified: { type: Boolean, default: false },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_, ret) {
        delete ret.passwordHash;
        delete ret.githubToken;
        delete ret.__v;
        return ret;
      },
    },
  }
);

userSchema.pre('save', async function (next) {
  if (this.isModified('passwordHash') && this.passwordHash) {
    this.passwordHash = await bcrypt.hash(this.passwordHash, 12);
  }
  next();
});

userSchema.methods.comparePassword = async function (candidate) {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidate, this.passwordHash);
};

userSchema.methods.incrementApiCalls = async function () {
  const now = new Date();
  const hoursSinceReset = (now - this.lastApiReset) / (1000 * 60 * 60);
  if (hoursSinceReset >= 24) {
    this.apiCallsToday = 1;
    this.lastApiReset = now;
  } else {
    this.apiCallsToday += 1;
  }
  return this.save();
};

export const User = mongoose.model('User', userSchema);
