import express from 'express'
import { searchStation } from '../controller/station'
import { search_station_schema } from "../helper.ts/schema"
import { validate_body } from "../helper.ts/helpfn"
const router = express.Router()

router.post("/searchStation", validate_body(search_station_schema), searchStation)


export default router