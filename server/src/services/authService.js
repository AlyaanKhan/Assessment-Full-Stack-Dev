import bcrypt from 'bcryptjs';
import jsonwebtoken from 'jsonwebtoken';
import { config } from '../config.js';
import { runQueryForOneRow } from '../db/pool.js';
import { createHttpError, normalizeEmail, removePasswordHashFromUser } from '../utils/utils.js';

const PASSWORD_HASH_ROUNDS = 10;

// Creates the signed token the browser sends back on every later request.
// Use this right after a successful signup or login.
function createLoginToken(user) {
  return jsonwebtoken.sign(
    { userId: user.id, email: user.email },
    config.jwtSecret,
    { expiresIn: config.jwtExpiresIn }
  );
}

// Looks up one user by their email address.
// Use this to check whether an email is already taken, or to log someone in.
export async function findUserByEmail(email) {
  return runQueryForOneRow(
    'SELECT * FROM users WHERE email = $1',
    [normalizeEmail(email)]
  );
}

// Looks up one user by their id, without the password hash.
// Use this to answer "who am I" for a request that already has a valid token.
export async function findUserById(userId) {
  return runQueryForOneRow(
    'SELECT id, business_id, email, name, created_at FROM users WHERE id = $1',
    [userId]
  );
}

// Registers a new person and logs them straight in.
// Use this for the signup form.
export async function signUpUser({ name, email, password }) {
  const emailToUse = normalizeEmail(email);

  const existingUser = await findUserByEmail(emailToUse);
  if (existingUser) {
    throw createHttpError(400, 'An account with that email already exists.');
  }

  const passwordHash = await bcrypt.hash(password, PASSWORD_HASH_ROUNDS);

  // Every user joins the one business this prototype seeds. In a real SaaS the
  // business would come from the signup link or the invite.
  const newUser = await runQueryForOneRow(
    `INSERT INTO users (business_id, email, password_hash, name)
     VALUES ((SELECT id FROM businesses ORDER BY created_at LIMIT 1), $1, $2, $3)
     RETURNING id, business_id, email, name, created_at`,
    [emailToUse, passwordHash, name.trim()]
  );

  if (!newUser) {
    throw createHttpError(500, 'Could not create the account.');
  }

  return { user: newUser, token: createLoginToken(newUser) };
}

// Checks an email and password, and hands back a token if they match.
// Use this for the login form.
export async function logInUser({ email, password }) {
  const user = await findUserByEmail(email);

  // The same message is used for a wrong email and a wrong password, so nobody
  // can use this endpoint to find out which emails are registered.
  const failureMessage = 'That email and password do not match.';
  if (!user) {
    throw createHttpError(401, failureMessage);
  }

  const passwordIsCorrect = await bcrypt.compare(password, user.password_hash);
  if (!passwordIsCorrect) {
    throw createHttpError(401, failureMessage);
  }

  return {
    user: removePasswordHashFromUser(user),
    token: createLoginToken(user),
  };
}

// Gets the profile of the person the token belongs to.
// Use this when the app reloads and needs to know who is logged in.
export async function getCurrentUser(userId) {
  const user = await findUserById(userId);
  if (!user) {
    throw createHttpError(404, 'That user no longer exists.');
  }
  return user;
}
