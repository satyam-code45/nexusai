import mongoose from "mongoose";
import { User } from "../models/userSchema";

export class UserService {
  private static instance: UserService;

  // singleton design pattern
  public static getInstance(): UserService {
    if (!UserService.instance) {
      UserService.instance = new UserService();
    }
    return UserService.instance;
  }

  async findByEmail(email: string) {
    const user = await User.findOne({ email: email });
    return user;
  }

  async findById(id: string) {
    const user = await User.findById(id).select("_id").lean();
    return user;
  }

  async createUser(props: {
    id: string;
    name: string;
    email: string;
    image: string;
    access_token?: string;
    refresh_token?: string;
  }) {
    const { id, name, image, email, access_token, refresh_token } = props;

    const existingUser = await this.findByEmail(email);

    if (!existingUser) {
      const user = new User({
        name: name,
        email: email,
        image: image,
        googleAccessToken: access_token,
        googleRefreshToken: refresh_token,
        googleId: id,
      });

      const newUser = await user.save();

      return {
        authData: {
          ...newUser.toObject(),
        },
      };
    } else {
      const user = await User.findByIdAndUpdate(
        existingUser?._id,
        {
          googleAccessToken: access_token,
          googleRefreshToken: refresh_token,
        },
        { new: true, runValidators: true },
      );
      const updateUser = user?.toObject();

      return {
        authData: {
          ...updateUser,
        },
      };
    }
  }
}
