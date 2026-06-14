import { NextFunction, Request, Response } from 'express'
import { constants } from 'http2'
import BadRequestError from '../errors/bad-request-error'

export const uploadFile = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        if (!req.file) {
            return next(new BadRequestError('Файл не загружен'))
        }

        if (req.file.size < 2 * 1024) {
            return next(new BadRequestError('Файл слишком маленький'))
        }

        const fileName = process.env.UPLOAD_PATH
            ? `/${process.env.UPLOAD_PATH}/${req.file.filename}`
            : `/${req.file.filename}`

        return res.status(constants.HTTP_STATUS_CREATED).send({
            fileName,
            originalName: req.file.originalname,
            mimeType: req.file.mimetype,
            size: req.file.size,
        })
    } catch (error) {
        return next(error)
    }
}
