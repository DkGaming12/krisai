import bcrypt from "bcryptjs";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

const USERS_FILE = path.join(process.cwd(), "data", "users.json");

const ownerUser = {
  id: uuidv4(),
  username: "Kristian",
  email: "didikpurnomoipung21@gmail.com",
  passwordHash: bcrypt.hashSync("DidikGanteng12", 10),
  tokens: 1000,
  isOwner: true,
  createdAt: Date.now(),
};

try {
  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    const raw = fs.readFileSync(USERS_FILE, "utf-8");
    users = JSON.parse(raw || "[]");
  }

  // Check if owner already exists
  const exists = users.find((u) => u.username.toLowerCase() === "kristian");
  if (exists) {
    console.log("❌ Owner account 'Kristian' sudah ada.");
    process.exit(0);
  }

  users.push(ownerUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), "utf-8");

  console.log("✅ Owner account created:");
  console.log(`   Username: ${ownerUser.username}`);
  console.log(`   Email: ${ownerUser.email}`);
  console.log(`   Tokens: ${ownerUser.tokens}`);
  console.log(`   ID: ${ownerUser.id}`);
} catch (e) {
  console.error("❌ Error creating owner account:", e.message);
  process.exit(1);
}
