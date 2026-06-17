import { Router } from 'express'
import { uploadFile } from '../controllers/upload'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import fileMiddleware from '../middlewares/file'
import { validateUploadedImage } from '../middlewares/upload-image-validation'
import { Role } from '../models/user'

const uploadRouter = Router()

uploadRouter.post(
    '/',
    auth,
    roleGuardMiddleware(Role.Admin),
    fileMiddleware.single('file'),
    validateUploadedImage,
    uploadFile
)

export default uploadRouter
