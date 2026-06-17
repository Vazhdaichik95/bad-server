import { NextFunction, Request, Response } from 'express'
import { unlink } from 'fs/promises'
import sharp from 'sharp'
import BadRequestError from '../errors/bad-request-error'

export const validateUploadedImage = async (
    req: Request,
    _res: Response,
    next: NextFunction
) => {
    try {
        if (!req.file) {
            return next(new BadRequestError('Файл не загружен'))
        }

        if (req.file.size < 2 * 1024) {
            await unlink(req.file.path).catch(() => null)
            return next(new BadRequestError('Файл слишком маленький'))
        }

        const metadata = await sharp(req.file.path).metadata()

        if (!metadata.format || !metadata.width || !metadata.height) {
            await unlink(req.file.path).catch(() => null)
            return next(new BadRequestError('Некорректное изображение'))
        }

        return next()
    } catch (_error) {
        if (req.file?.path) {
            await unlink(req.file.path).catch(() => null)
        }

        return next(new BadRequestError('Некорректное изображение'))
    }
}
