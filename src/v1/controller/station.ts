import { Request, Response } from "express"
import station_obj from "../model/dbstation"

export const searchStation = async function (req: Request, res: Response) {
    try {
        const { station_name_or_code, page } = req.body
        const response = await station_obj.search_station({ station_name_or_code }, "id , stn_name", page);
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
}