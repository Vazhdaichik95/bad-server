import crypto from 'crypto'
import { Request, Express } from 'express'
import multer, { FileFilterCallback } from 'multer'
import { mkdirSync } from 'fs'
import { join, extname } from 'path'
import BadRequestError from '../errors/bad-request-error'

type DestinationCallback = (error: Error | null, destination: string) => void
type FileNameCallback = (error: Error | null, filename: string) => void

const allowedMimeTypes = ['image/png', 'image/jpg', 'image/jpeg', 'image/webp']

const mimeToExtensionMap: Record<string, string> = {
    'image/png': '.png',
    'image/jpg': '.jpg',
    'image/jpeg': '.jpg',
    'image/webp': '.webp',
}

const storage = multer.diskStorage({
    destination: (
        _req: Request,
        _file: Express.Multer.File,
        cb: DestinationCallback
    ) => {
        const destinationPath = join(
            __dirname,
            process.env.UPLOAD_PATH_TEMP
                ? `../public/${process.env.UPLOAD_PATH_TEMP}`
                : '../public'
        )

        mkdirSync(destinationPath, { recursive: true })
        cb(null, destinationPath)
    },

    filename: (
        _req: Request,
        file: Express.Multer.File,
        cb: FileNameCallback
    ) => {
        const safeExtension =
            mimeToExtensionMap[file.mimetype] ||
            extname(file.originalname).toLowerCase() ||
            '.bin'

        const safeName = `${crypto.randomUUID()}${safeExtension}`
        cb(null, safeName)
    },
})

const fileFilter = (
    _req: Request,
    file: Express.Multer.File,
    cb: FileFilterCallback
) => {
    if (!allowedMimeTypes.includes(file.mimetype)) {
        return cb(new BadRequestError('Недопустимый тип файла'))
    }

    return cb(null, true)
}

const fileMiddleware = multer({
    storage,
    fileFilter,
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
})

export default fileMiddleware
