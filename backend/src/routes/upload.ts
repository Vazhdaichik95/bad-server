import { Router, Request, Response, NextFunction } from 'express'
import multer from 'multer'
import { uploadFile } from '../controllers/upload'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import fileMiddleware from '../middlewares/file'
import { validateUploadedImage } from '../middlewares/upload-image-validation'
import { Role } from '../models/user'
import BadRequestError from '../errors/bad-request-error'

const uploadRouter = Router()

const uploadSingleFile = (req: Request, res: Response, next: NextFunction) => {
    fileMiddleware.single('file')(req, res, (err: unknown) => {
        if (!err) {
            return next()
        }

        if (err instanceof multer.MulterError) {
            if (err.code === 'LIMIT_FILE_SIZE') {
                return next(new BadRequestError('Файл слишком большой'))
            }

            return next(new BadRequestError('Ошибка загрузки файла'))
        }

        return next(err)
    })
}

uploadRouter.post(
    '/',
    auth,
    roleGuardMiddleware(Role.Admin),
    uploadSingleFile,
    validateUploadedImage,
    uploadFile
)

export default uploadRouter
