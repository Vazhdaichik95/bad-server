import { NextFunction, Request, Response } from 'express'
import { FilterQuery } from 'mongoose'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'
import Order from '../models/order'
import User, { IUser } from '../models/user'
import escapeRegExp from '../utils/escapeRegExp'
import { normalizeLimit, normalizePage } from '../utils/pagination'
import sanitizePhone from '../utils/sanitizePhone'
import sanitizeText from '../utils/sanitizeText'

// GET /customers
export const getCustomers = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const {
            page = 1,
            limit = 10,
            sortField = 'createdAt',
            sortOrder = 'desc',
            registrationDateFrom,
            registrationDateTo,
            lastOrderDateFrom,
            lastOrderDateTo,
            totalAmountFrom,
            totalAmountTo,
            orderCountFrom,
            orderCountTo,
            search,
        } = req.query

        if (search !== undefined && typeof search !== 'string') {
            return next(new BadRequestError('Некорректный параметр search'))
        }

        if (sortField !== undefined && typeof sortField !== 'string') {
            return next(new BadRequestError('Некорректный параметр sortField'))
        }

        if (
            sortOrder !== undefined &&
            sortOrder !== 'asc' &&
            sortOrder !== 'desc'
        ) {
            return next(new BadRequestError('Некорректный параметр sortOrder'))
        }

        const normalizedPage = normalizePage(page)
        const normalizedLimit = normalizeLimit(limit)

        const filters: FilterQuery<Partial<IUser>> = {}

        if (registrationDateFrom && typeof registrationDateFrom === 'string') {
            const date = new Date(registrationDateFrom)
            if (Number.isNaN(date.getTime())) {
                return next(
                    new BadRequestError(
                        'Некорректный параметр registrationDateFrom'
                    )
                )
            }

            filters.createdAt = {
                ...filters.createdAt,
                $gte: date,
            }
        }

        if (registrationDateTo && typeof registrationDateTo === 'string') {
            const endOfDay = new Date(registrationDateTo)
            if (Number.isNaN(endOfDay.getTime())) {
                return next(
                    new BadRequestError(
                        'Некорректный параметр registrationDateTo'
                    )
                )
            }

            endOfDay.setHours(23, 59, 59, 999)
            filters.createdAt = {
                ...filters.createdAt,
                $lte: endOfDay,
            }
        }

        if (lastOrderDateFrom && typeof lastOrderDateFrom === 'string') {
            const date = new Date(lastOrderDateFrom)
            if (Number.isNaN(date.getTime())) {
                return next(
                    new BadRequestError(
                        'Некорректный параметр lastOrderDateFrom'
                    )
                )
            }

            filters.lastOrderDate = {
                ...filters.lastOrderDate,
                $gte: date,
            }
        }

        if (lastOrderDateTo && typeof lastOrderDateTo === 'string') {
            const endOfDay = new Date(lastOrderDateTo)
            if (Number.isNaN(endOfDay.getTime())) {
                return next(
                    new BadRequestError(
                        'Некорректный параметр lastOrderDateTo'
                    )
                )
            }

            endOfDay.setHours(23, 59, 59, 999)
            filters.lastOrderDate = {
                ...filters.lastOrderDate,
                $lte: endOfDay,
            }
        }

        if (totalAmountFrom !== undefined) {
            const parsed = Number(totalAmountFrom)
            if (!Number.isFinite(parsed)) {
                return next(
                    new BadRequestError(
                        'Некорректный параметр totalAmountFrom'
                    )
                )
            }

            filters.totalAmount = {
                ...filters.totalAmount,
                $gte: parsed,
            }
        }

        if (totalAmountTo !== undefined) {
            const parsed = Number(totalAmountTo)
            if (!Number.isFinite(parsed)) {
                return next(
                    new BadRequestError('Некорректный параметр totalAmountTo')
                )
            }

            filters.totalAmount = {
                ...filters.totalAmount,
                $lte: parsed,
            }
        }

        if (orderCountFrom !== undefined) {
            const parsed = Number(orderCountFrom)
            if (!Number.isFinite(parsed)) {
                return next(
                    new BadRequestError('Некорректный параметр orderCountFrom')
                )
            }

            filters.orderCount = {
                ...filters.orderCount,
                $gte: parsed,
            }
        }

        if (orderCountTo !== undefined) {
            const parsed = Number(orderCountTo)
            if (!Number.isFinite(parsed)) {
                return next(
                    new BadRequestError('Некорректный параметр orderCountTo')
                )
            }

            filters.orderCount = {
                ...filters.orderCount,
                $lte: parsed,
            }
        }

        if (typeof search === 'string' && search.trim()) {
            const searchRegex = new RegExp(
                escapeRegExp(search.trim().slice(0, 100)),
                'i'
            )

            const orders = await Order.find(
                {
                    $or: [{ deliveryAddress: searchRegex }],
                },
                '_id'
            )

            const orderIds = orders.map((order) => order._id)

            filters.$or = [
                { name: searchRegex },
                { lastOrder: { $in: orderIds } },
            ]
        }

        const allowedSortFields = [
            'createdAt',
            'name',
            'totalAmount',
            'orderCount',
            'lastOrderDate',
        ]

        const safeSortField = allowedSortFields.includes(sortField)
            ? sortField
            : 'createdAt'

        const sort: Record<string, 1 | -1> = {
            [safeSortField]: sortOrder === 'asc' ? 1 : -1,
        }

        const options = {
            sort,
            skip: (normalizedPage - 1) * normalizedLimit,
            limit: normalizedLimit,
        }

        const users = await User.find(filters, null, options).populate([
            'orders',
            {
                path: 'lastOrder',
                populate: {
                    path: 'products',
                },
            },
            {
                path: 'lastOrder',
                populate: {
                    path: 'customer',
                },
            },
        ])

        const totalUsers = await User.countDocuments(filters)
        const totalPages = Math.ceil(totalUsers / normalizedLimit)

        res.status(200).json({
            customers: users,
            pagination: {
                totalUsers,
                totalPages,
                currentPage: normalizedPage,
                pageSize: normalizedLimit,
            },
        })
    } catch (error) {
        next(error)
    }
}

// GET /customers/:id
export const getCustomerById = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const user = await User.findById(req.params.id).populate([
            'orders',
            'lastOrder',
        ])

        res.status(200).json(user)
    } catch (error) {
        next(error)
    }
}

// PATCH /customers/:id
export const updateCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const allowedUpdates = {
            name: sanitizeText(req.body.name),
            phone: sanitizePhone(req.body.phone),
            email:
                typeof req.body.email === 'string'
                    ? sanitizeText(req.body.email).toLowerCase()
                    : '',
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            allowedUpdates,
            {
                new: true,
                runValidators: true,
            }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )
            .populate(['orders', 'lastOrder'])

        res.status(200).json(updatedUser)
    } catch (error) {
        next(error)
    }
}

// DELETE /customers/:id
export const deleteCustomer = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const deletedUser = await User.findByIdAndDelete(req.params.id).orFail(
            () =>
                new NotFoundError(
                    'Пользователь по заданному id отсутствует в базе'
                )
        )

        res.status(200).json(deletedUser)
    } catch (error) {
        next(error)
    }
}
