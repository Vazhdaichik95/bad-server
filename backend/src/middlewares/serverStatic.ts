import { NextFunction, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'

export default function serveStatic(baseDir: string) {
    const absoluteBaseDir = path.resolve(baseDir)

    return (req: Request, res: Response, next: NextFunction) => {
        try {
            const requestPath = decodeURIComponent(req.path)
            const filePath = path.resolve(absoluteBaseDir, `.${requestPath}`)
            const relative = path.relative(absoluteBaseDir, filePath)

            if (relative.startsWith('..') || path.isAbsolute(relative)) {
                return res.status(403).json({
                    success: false,
                    message: 'Доступ запрещён',
                })
            }

            fs.access(filePath, fs.constants.F_OK, (err) => {
                if (err) {
                    return next()
                }

                return res.sendFile(filePath, (sendErr) => {
                    if (sendErr) next(sendErr)
                })
            })
        } catch (error) {
            return next(error)
        }
    }
}
