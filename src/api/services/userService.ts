import mongoose, { FilterQuery } from "mongoose";
import { IRole } from "../models/rolesModel";
import { IUser, PopulatedUser, User } from "../models/userModel";
import bcrypt from "bcrypt";
import generateRandomPassword from "@static/types/backend/randomPassword";
import RegisterationMail from "./emails/registeration";
import { HydratedDocument } from "mongoose";

export interface ICheckUser {
  _id?: mongoose.Types.ObjectId;
  email?: string;
  refreshToken?: string;
}

export const checkUserExists = async ({
  email,
  refreshToken,
  _id,
}: ICheckUser): Promise<PopulatedUser | null> => {
  // look into previous commit if this doesn't "look" good to you
  const conditions: object[] = [];
  if (_id) conditions.push({ _id });
  if (email) conditions.push({ email });
  if (refreshToken) conditions.push({ refreshToken });

  if (conditions.length > 0) {
    const user = await User.findOne({ $or: conditions }).populate<{
      role_id: HydratedDocument<IRole>;
    }>("role_id");
    return user;
  }

  return null;
};

export const addRefreshToken = async (
  email: string,
  refreshToken: string,
): Promise<PopulatedUser | null> => {
  const user = await User.findOneAndUpdate(
    { email: email },
    { refreshToken: refreshToken },
    { returnDocument: "after" },
  ).populate<{ role_id: HydratedDocument<IRole> }>("role_id");
  return user;
};

export const deleteRefreshToken = async (
  email: string,
): Promise<PopulatedUser | null> => {
  const user = await User.findOneAndUpdate(
    { email: email },
    { refreshToken: null },
    { returnDocument: "after" },
  ).populate<{ role_id: HydratedDocument<IRole> }>("role_id");
  return user;
};

export const getAllUsers = async (
  query: FilterQuery<HydratedDocument<IUser>>,
): Promise<PopulatedUser[]> => {
  const allUsers = await User.find(query).populate<{
    role_id: HydratedDocument<IRole>;
  }>("role_id");
  return allUsers;
};

export const createNewUser = async (
  name: string,
  email: string,
  role_id: string,
) => {
  const password: string = generateRandomPassword(7);
  const hashed_password: string = await bcrypt.hash(password, 10);

  const user = await User.create({
    name: name,
    email: email,
    password: hashed_password,
    role_id: role_id,
  });

  const reg_mail = new RegisterationMail(user, password);
  await reg_mail.sendTo(email);
  if (!reg_mail) return null;

  return user;
};

export const createNewUsers = async (users: Array<IUser>) => {
  const createdUsers: HydratedDocument<IUser>[] = [];
  const incomingEmails = users.map((user) => user.email);
  const existingUsers = await User.find({ email: { $in: incomingEmails } });
  const existingEmails = existingUsers.map((user) => user.email);

  console.log(existingEmails);

  for (const user of users) {
    if (existingEmails.includes(user.email)) {
      continue;
    }
    const password: string = generateRandomPassword(7);
    const hashed_password: string = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      ...user,
      password: hashed_password,
    });
    const reg_mail = new RegisterationMail(newUser, password);
    await reg_mail.sendTo(newUser.email);
    createdUsers.push(newUser);
  }
  return { createdUsers, existingUsers };
};
