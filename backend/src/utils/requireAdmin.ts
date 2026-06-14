import { NextFunction, Request, Response } from 'express'
import { Role } from '../models/user'

export default function requireAdmin(
  _req: Request,
  res: Response,
  next: NextFunction
) {
  const roles = res.locals.user?.roles || []

  if (!Array.isArray(roles) || !roles.includes(Role.Admin)) {
    return res.status(403).json({
      success: false,
      message: 'Недостаточно прав',
    })
  }

  return next()
}
