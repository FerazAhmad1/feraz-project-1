import { Request, Response } from "express";
import user from "../model/dbusers";

export const signup_otp = async function (req: Request, res: Response) {
  try {
    const response = await user.signup_otp(req.body)
    if (!response || response.error) {
      throw {
        message: response?.message || "your model function is not working"
      }
    }
    res.status(200).json(response)
  } catch (error) {
    const err = error as any;
    res.status(400).json({
      error: true,
      message: err.message || "UNEXPECTED ERROR",
      data: {},
    });
  }
};

export const verify_otp = async function (req: Request, res: Response) {
  try {
    const response = await user.verifyotp(req.body)
    if (!response || response.error) {
      throw {
        message: response?.message || "your model function is not working"
      }
    }
    res.status(200).json(response)
  } catch (error) {
    const err = error as any;
    res.status(400).json({
      error: true,
      message: err.message || "UNEXPECTED ERROR",
      data: {},
    });
  }
};

export const login = async function (req: Request, res: Response) {
  try {
    const response = await user.login(req.body)
    if (!response || response.error) {
      throw {
        message: response?.message || "your model function is not working"
      }
    }
    res.status(200).json(response)
  } catch (error) {
    const err = error as any;
    res.status(400).json({
      error: true,
      message: err.message || "UNEXPECTED ERROR",
      data: {},
    });
  }
};

export const update_role = async function (req: any, res: Response) {
  try {

    const response = await user.update_role(req.body, req.user);
    if (!response || response.error) {
      throw {
        message: response?.message || "your model function is not working"
      }
    }
    res.status(200).json(response);

  } catch (error) {
    const err = error as any;
    res.status(500).json({
      error: true,
      message: err.message || "UNEXPECTED ERROR",
      data: {},
    });
  }
};

export const forgot_password = async function (req: Request, res: Response) {
  try {
    const host = req.get("host");
    const protocol = req.protocol
    const response = await user.forgot_password(req.body, protocol, host);
    if (!response || response.error) {
      throw {
        message: response?.message || "your model function is not working"
      }
    }
    res.status(200).json(response);
  } catch (error) {
    const err = error as any;
    res.status(400).json({
      error: true,
      message: err.message || "UNEXPECTED ERROR",
      data: {},
    });
  }
};


export const reset_password = async function (req: Request, res: Response) {
  try {
    const token = req.params.token;
    const password = req.body.password;
    const response = await user.reset_password(req.body, token, password);
    if (!response || response.error) {
      throw {
        message: response?.message || "your model function is not working"
      }
    }
    res.status(200).json(response);

  } catch (error) {
    const err = error as any;
    res.status(err.errorCode || 401).json({
      error: true,
      message: err.message || "UNEXPECTED ERROR",
      data: {},
    });
  }
};