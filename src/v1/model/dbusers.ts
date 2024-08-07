import { appdb } from "./appdb";
import { send_otp, generateOTP, create_random_token, formatDateString } from "../helper.ts/helpfn";
import bcrypt from "bcrypt"
import { signToken, send_mail } from "../helper.ts/helpfn";
import html_template from "../helper.ts/html"
import crypto from "crypto"
import { error } from "console";
interface signup_user {
  readonly firstName: string;
  readonly lastName: string;
  readonly mobile: number;
  readonly password: string;
}

type login_user =
  | {
    [index: string]: string;
    readonly email: string;
  }
  | { [index: string]: number; readonly id: number };

export class dbusers extends appdb {
  constructor() {
    super();
    this.table = "users";
    this.uniqueField = "id";
  }
  static whereClause(obj: login_user) {
    let where = "WHERE ";
    for (let key in obj) {
      where += `${key} = '${obj[key]}' `;
    }
    return where;
  }
  async insertUser(userObj: any) {
    try {
      return await this.insertRecord(userObj);
    } catch (error) {
      throw error;
    }
  }
  async getUser(login_body: login_user) {
    try {
      this.where = dbusers.whereClause(login_body);
      this.page = 1;
      this.rpp = 1;
      this.orderby = "";
      const user: any[] = await this.listRecords("*");

      return user;
    } catch (error) {
      throw error;
    }
  }
  async update_user(id: number, data: any) {
    try {
      return await this.updateRecord(id, data);
    } catch (error) {
      throw error;
    }
  }


  async signup_otp(req_body: any) {
    try {
      const validate = req_body;
      const { email } = validate;
      const db_user = await this.getUser({ email });
      if (db_user.length > 0) {
        const { password = null } = db_user[0];
        if (password) {
          throw {
            message: "this email is already registered with us",
          };
        }

        const { otp_expiry } = db_user[0];
        // otp is not null and it is not expired yet
        if (otp_expiry && new Date(otp_expiry) > new Date()) {
          // resend the same otp
          const { otp } = db_user[0];
          const mailResponse = await send_otp(otp, email);
          return {
            error: false,
            message: "a six digit otp has been sended to your email",
            data: { otp },
          };
        }

        // otp is not null and expired

        if (otp_expiry && new Date(otp_expiry) < new Date()) {
          // resend new otp and set new expiry time
          const otp = generateOTP();
          const newExpirytime = formatDateString(
            new Date(Date.now() + 10 * 60 * 1000),
            "YYYY-MM-DD HH:mm:ss"
          );
          const { id } = db_user[0];
          const response = await this.update_user(id, {
            otp_expiry: newExpirytime,
            otp,
          });
          if (!response) {
            throw { message: "error is coming from update_user" };
          }
          const mailResponse = await send_otp(otp, email);
          return ({
            error: false,
            message: "a six digit otp has been sended to your email",
            data: { otp },
          });
        }
      }
      const otp = generateOTP();
      const newExpirytime = formatDateString(
        new Date(Date.now() + 10 * 60 * 1000),
        "YYYY-MM-DD HH:mm:ss"
      );
      const insertUser_response = await this.insertUser({
        email,
        otp,
        otp_expiry: newExpirytime,
      });
      if (!insertUser_response) {
        throw { message: "error is coming from insertUser method" };
      }
      const mailResponse = await send_otp(otp, email);

      return ({
        error: false,
        message: "a six digit otp has been sended to your email",
        data: { otp },
      });
    } catch (error) {
      throw error
    }
  }

  async verifyotp(req_body: any) {
    try {
      const validate = req_body
      const db_user = await this.getUser({ email: validate.email });
      if (db_user.length === 0) {
        throw { message: "user not found" };
      }
      const { otp: dbotp, otp_expiry } = db_user[0];

      if (new Date(otp_expiry) < new Date()) {
        throw {
          message: "otp has been expire",
        };
      }

      if (validate.otp !== dbotp) {
        throw {
          message: "Incorrect otp",
        };
      }

      const {
        firstName: firstname,
        lastName: lastname,
        password,
        email,
        mobile,
      } = validate;
      const id = db_user[0].id;
      const hashed_password = await bcrypt.hash(password, 12);
      const updateUser = await user.update_user(id, {
        firstname,
        lastname,
        password: hashed_password,
        email,
        mobile,
        otp: null,
        otp_expiry: null,
      });
      if (!updateUser) {
        throw {
          message: "error is coming from update_user",
        };
      }
      const token = signToken(id);

      return {
        error: false,
        message: "user is signup successfully",
        data: {
          token,
        },
      };
    } catch (error) {
      const err = error as any;
      throw error
    }
  }


  async login(req_body: any) {
    try {
      const validate = req_body
      const { email = null, password: login_password = null } = req_body;
      const db_user = await this.getUser({ email });
      if (db_user.length === 0) {
        throw { message: "This email is not registed" };
      }
      const { password: db_password, id } = db_user[0];
      const validate_password = await bcrypt.compare(login_password, db_password);

      if (!validate_password) {
        throw { message: "email or password is wrong" };
      }
      const token = signToken(id);
      return {
        error: false,
        message: "login successfull",
        data: { token },
      };
    } catch (err) {

      throw err
    }
  }


  async update_role(req_body: any, user: any) {
    try {
      const data = { role: "agent" };
      const response = await this.update_user(user.id, data);
      if (response !== 1) {
        throw {
          message: "Internal server error",
        };
      }
      const data_to_send = {
        ...user,
        role: "agent",
        reset_password_token: undefined,
        change_password_at: undefined,
        password: undefined,
      };

      return {
        error: false,
        message: "you are now agent",
        data: { updated_user: data_to_send },
      };

    } catch (error) {
      throw error
    }
  }


  async forgot_password(req_body: any, protocol: any, host: any) {
    try {
      const validate = req_body
      const response = await user.getUser({ email: validate.email });
      if (response.length === 0) {
        throw {
          message: "this email does not exist with us",
        };
      }
      const [random_token, hashed_token] = create_random_token();

      await user.update_user(response[0].id, {
        reset_password_token: hashed_token,
      });
      const reset_link = `${protocol}://${host}/v1/user/resetpassword/${random_token}`;

      let html = html_template.replace(
        "REPLACE_WITH_HTML_CONTENT",
        "<p>To reset password please click on below tab</p>"
      );
      html = html.replace("REPLACE_WITH_LINK", reset_link);
      html = html.replace("REPLACE_WITH_TAB", "reset password");
      const subject = "reset your password";
      const sender = "feraz@gmail.com";
      const mail_response = await send_mail({
        html,
        sender,
        subject,
        reciever: validate.email,
      });
      return {
        error: false,
        message: "resetlink hasbeen sended to your email",
        data: { reset_link },
      };
    } catch (error) {

      throw error
    }
  }



  async reset_password(req_body: any, token: any, password: any) {
    try {
      const validate = req_body
      if (!token) {
        throw {
          message: "you are not autorize to perform this action ",
        };
      }
      const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

      const query_find_user = `select * from users where reset_password_token = '${hashedToken}'`;
      const requested_user = await user.executeQuery(query_find_user);
      if (!requested_user) {
        throw {
          message: "Invalid user",
        };
      }
      if (requested_user[0].email !== validate.email) {
        throw { message: "unauthorize user" }
      }
      const hashed_password = await bcrypt.hash(password, 12);
      const query_update_password = await user.update_user(requested_user[0].id, {
        password: hashed_password,
      });
      if (!query_update_password) {
        throw {
          errorCode: 500,
          message: "internal server error",
        };
      }
      return {
        error: false,
        message: "your password has been change successfully",
        data: {},
      };
    } catch (error) {
      throw error
    }
  }


}
const user = new dbusers();
export default user;
