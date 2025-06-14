import mongoose from "mongoose";

mongoose.connect("mongodb://localhost:27017");

const UserSchema = new mongoose.Schema({
  username: String,
  password: String,
  privateKey: String,
  publicKey: String,
});

export const userModel = mongoose.model("users", UserSchema);
