import { NextFunction, Request, Response } from 'express'
import jwt, { JwtPayload } from 'jsonwebtoken'
import { Model, Types } from 'mongoose'
import { ACCESS_TOKEN } from '../config'
import ForbiddenError from '../errors/forbidden-error'
import NotFoundError from '../errors/not-found-error'
import UnauthorizedError from '../errors/unauthorized-error'
import UserModel, { Role } from '../models/user'

const auth = async (req: Request, res: Response, next: NextFunction) => {
    try {
        const authHeader = req.header('Authorization')

        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next(new UnauthorizedError('Невалидный токен'))
        }

        const accessTokenParts = authHeader.split(' ')
        const accessToken = accessTokenParts[1]

        if (!accessToken) {
            return next(new UnauthorizedError('Невалидный токен'))
        }

        const payload = jwt.verify(
            accessToken,
            ACCESS_TOKEN.secret
        ) as JwtPayload

        if (!payload?.sub || !Types.ObjectId.isValid(payload.sub)) {
            return next(new UnauthorizedError('Невалидный токен'))
        }

        const user = await UserModel.findById(payload.sub, {
            password: 0,
            salt: 0,
        })

        if (!user) {
            return next(new ForbiddenError('Нет доступа'))
        }

        res.locals.user = user
        return next()
    } catch (error) {
        if (error instanceof Error && error.name === 'TokenExpiredError') {
            return next(new UnauthorizedError('Истек срок действия токена'))
        }

        return next(new UnauthorizedError('Необходима авторизация'))
    }
}

export function roleGuardMiddleware(...roles: Role[]) {
    return (_req: Request, res: Response, next: NextFunction) => {
        if (!res.locals.user) {
            return next(new UnauthorizedError('Необходима авторизация'))
        }

        const userRoles = Array.isArray(res.locals.user.roles)
            ? res.locals.user.roles
            : []

        const hasAccess = roles.some((role) => userRoles.includes(role))

        if (!hasAccess) {
            return next(new ForbiddenError('Доступ запрещен'))
        }

        return next()
    }
}

export function currentUserAccessMiddleware<T extends Record<string, any>>(
    model: Model<T>,
    idProperty: string,
    userProperty: keyof T
) {
    return async (req: Request, res: Response, next: NextFunction) => {
        try {
            const id = req.params[idProperty]

            if (!res.locals.user) {
                return next(new UnauthorizedError('Необходима авторизация'))
            }

            if (res.locals.user.roles.includes(Role.Admin)) {
                return next()
            }

            if (!Types.ObjectId.isValid(id)) {
                return next(new NotFoundError('Не найдено'))
            }

            const entity = await model.findById(id)

            if (!entity) {
                return next(new NotFoundError('Не найдено'))
            }

            const userEntityId = entity[userProperty] as Types.ObjectId
            const hasAccess = new Types.ObjectId(res.locals.user._id).equals(
                userEntityId
            )

            if (!hasAccess) {
                return next(new ForbiddenError('Доступ запрещен'))
            }

            return next()
        } catch (error) {
            return next(error)
        }
    }
}

export default auth
