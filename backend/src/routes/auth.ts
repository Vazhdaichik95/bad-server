import { Router } from 'express'
import {
    getCsrfToken,
    getCurrentUser,
    getCurrentUserRoles,
    login,
    logout,
    refreshAccessToken,
    register,
    updateCurrentUser,
} from '../controllers/auth'
import auth from '../middlewares/auth'
import {
    issueCsrfToken,
    verifyCsrfToken,
    verifyOrigin,
} from '../middlewares/csrf'

const authRouter = Router()

authRouter.get('/csrf-token', issueCsrfToken, getCsrfToken)

authRouter.get('/user', auth, getCurrentUser)
authRouter.get('/user/roles', auth, getCurrentUserRoles)

authRouter.post('/login', issueCsrfToken, login)
authRouter.post('/register', issueCsrfToken, register)

authRouter.patch('/me', auth, verifyOrigin, verifyCsrfToken, updateCurrentUser)
authRouter.post('/token', verifyOrigin, verifyCsrfToken, refreshAccessToken)
authRouter.post('/logout', verifyOrigin, verifyCsrfToken, logout)

export default authRouter
