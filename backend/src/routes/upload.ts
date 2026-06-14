import { Router } from 'express'
import { uploadFile } from '../controllers/upload'
import auth, { roleGuardMiddleware } from '../middlewares/auth'
import fileMiddleware from '../middlewares/file'
import { Role } from '../models/user'

const uploadRouter = Router()

uploadRouter.post(
    '/',
    auth,
    roleGuardMiddleware(Role.Admin),
    fileMiddleware.single('file'),
    uploadFile
)

export default uploadRouter
