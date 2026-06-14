import { NextFunction, Request, Response } from 'express'
import { FilterQuery, Error as MongooseError, Types } from 'mongoose'
import BadRequestError from '../errors/bad-request-error'
import NotFoundError from '../errors/not-found-error'
import Order, { IOrder } from '../models/order'
import Product, { IProduct } from '../models/product'
import User from '../models/user'
import sanitizeText from '../utils/sanitizeText'

const escapeRegExp = (value: string): string =>
    value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const normalizePage = (value: unknown, defaultValue = 1): number => {
    const parsed = Number(value)

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return defaultValue
    }

    return Math.trunc(parsed)
}

const normalizeLimit = (
    value: unknown,
    defaultValue = 10,
    max = 10
): number => {
    const parsed = Number(value)

    if (!Number.isFinite(parsed) || parsed <= 0) {
        return defaultValue
    }

    return Math.min(Math.trunc(parsed), max)
}

const sanitizePhone = (value: unknown): string => {
    if (typeof value !== 'string') {
        return ''
    }

    return value
        .replace(/[^\d+()\- ]/g, '')
        .trim()
        .slice(0, 20)
}

// eslint-disable-next-line max-len
// GET /orders?page=2&limit=5&sortField=totalAmount&sortOrder=desc&orderDateFrom=2024-07-01&orderDateTo=2024-08-01&status=delivering&totalAmountFrom=100&totalAmountTo=1000&search=%2B1
export const getOrders = async (
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
            status,
            totalAmountFrom,
            totalAmountTo,
            orderDateFrom,
            orderDateTo,
            search,
        } = req.query

        if (status !== undefined && typeof status !== 'string') {
            return next(new BadRequestError('Некорректный параметр status'))
        }

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

        const filters: FilterQuery<Partial<IOrder>> = {}
        const allowedStatuses = [
            'created',
            'pending',
            'paid',
            'processing',
            'delivering',
            'done',
            'cancelled',
        ]

        if (typeof status === 'string' && allowedStatuses.includes(status)) {
            filters.status = status
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

        if (orderDateFrom !== undefined) {
            if (typeof orderDateFrom !== 'string') {
                return next(
                    new BadRequestError('Некорректный параметр orderDateFrom')
                )
            }

            const fromDate = new Date(orderDateFrom)
            if (Number.isNaN(fromDate.getTime())) {
                return next(
                    new BadRequestError('Некорректный параметр orderDateFrom')
                )
            }

            filters.createdAt = {
                ...filters.createdAt,
                $gte: fromDate,
            }
        }

        if (orderDateTo !== undefined) {
            if (typeof orderDateTo !== 'string') {
                return next(
                    new BadRequestError('Некорректный параметр orderDateTo')
                )
            }

            const toDate = new Date(orderDateTo)
            if (Number.isNaN(toDate.getTime())) {
                return next(
                    new BadRequestError('Некорректный параметр orderDateTo')
                )
            }

            filters.createdAt = {
                ...filters.createdAt,
                $lte: toDate,
            }
        }

        const aggregatePipeline: any[] = [
            { $match: filters },
            {
                $lookup: {
                    from: 'products',
                    localField: 'products',
                    foreignField: '_id',
                    as: 'products',
                },
            },
            {
                $lookup: {
                    from: 'users',
                    localField: 'customer',
                    foreignField: '_id',
                    as: 'customer',
                },
            },
            { $unwind: '$customer' },
            { $unwind: '$products' },
        ]

        if (typeof search === 'string' && search.trim()) {
            const searchValue = search.trim().slice(0, 100)
            const searchRegex = new RegExp(escapeRegExp(searchValue), 'i')
            const searchNumber = Number(searchValue)

            const searchConditions: any[] = [{ 'products.title': searchRegex }]

            if (!Number.isNaN(searchNumber)) {
                searchConditions.push({ orderNumber: searchNumber })
            }

            aggregatePipeline.push({
                $match: {
                    $or: searchConditions,
                },
            })
        }

        const allowedSortFields = [
            'createdAt',
            'totalAmount',
            'status',
            'orderNumber',
        ]

        const safeSortField = allowedSortFields.includes(sortField)
            ? sortField
            : 'createdAt'

        const sort: Record<string, 1 | -1> = {
            [safeSortField]: sortOrder === 'asc' ? 1 : -1,
        }

        aggregatePipeline.push(
            { $sort: sort },
            { $skip: (normalizedPage - 1) * normalizedLimit },
            { $limit: normalizedLimit },
            {
                $group: {
                    _id: '$_id',
                    orderNumber: { $first: '$orderNumber' },
                    status: { $first: '$status' },
                    totalAmount: { $first: '$totalAmount' },
                    products: { $push: '$products' },
                    customer: { $first: '$customer' },
                    createdAt: { $first: '$createdAt' },
                },
            }
        )

        const orders = await Order.aggregate(aggregatePipeline)
        const totalOrders = await Order.countDocuments(filters)
        const totalPages = Math.ceil(totalOrders / normalizedLimit)

        res.status(200).json({
            orders,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: normalizedPage,
                pageSize: normalizedLimit,
            },
        })
    } catch (error) {
        next(error)
    }
}

export const getOrdersCurrentUser = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const userId = res.locals.user._id
        const { search, page = 1, limit = 5 } = req.query

        if (search !== undefined && typeof search !== 'string') {
            return next(new BadRequestError('Некорректный параметр search'))
        }

        const normalizedPage = normalizePage(page)
        const normalizedLimit = normalizeLimit(limit, 5, 10)

        const options = {
            skip: (normalizedPage - 1) * normalizedLimit,
            limit: normalizedLimit,
        }

        const user = await User.findById(userId)
            .populate({
                path: 'orders',
                populate: [
                    {
                        path: 'products',
                    },
                    {
                        path: 'customer',
                    },
                ],
            })
            .orFail(
                () =>
                    new NotFoundError(
                        'Пользователь по заданному id отсутствует в базе'
                    )
            )

        let orders = user.orders as unknown as IOrder[]

        if (typeof search === 'string' && search.trim()) {
            const searchValue = search.trim().slice(0, 100)
            const searchRegex = new RegExp(escapeRegExp(searchValue), 'i')
            const searchNumber = Number(searchValue)
            const products = await Product.find({ title: searchRegex })
            const productIds = products.map((product) => product._id)

            orders = orders.filter((order) => {
                const matchesProductTitle = order.products.some((product) =>
                    productIds.some((id) => id.equals(product._id))
                )

                const matchesOrderNumber =
                    !Number.isNaN(searchNumber) &&
                    order.orderNumber === searchNumber

                return matchesOrderNumber || matchesProductTitle
            })
        }

        const totalOrders = orders.length
        const totalPages = Math.ceil(totalOrders / normalizedLimit)

        orders = orders.slice(options.skip, options.skip + options.limit)

        return res.send({
            orders,
            pagination: {
                totalOrders,
                totalPages,
                currentPage: normalizedPage,
                pageSize: normalizedLimit,
            },
        })
    } catch (error) {
        next(error)
    }
}

// Get order by number
export const getOrderByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const orderNumber = Number(req.params.orderNumber)

        if (!Number.isFinite(orderNumber)) {
            return next(new BadRequestError('Передан не валидный номер заказа'))
        }

        const order = await Order.findOne({
            orderNumber,
        })
            .populate(['customer', 'products'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )

        return res.status(200).json(order)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

export const getOrderCurrentUserByNumber = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const userId = res.locals.user._id

    try {
        const orderNumber = Number(req.params.orderNumber)

        if (!Number.isFinite(orderNumber)) {
            return next(new BadRequestError('Передан не валидный номер заказа'))
        }

        const order = await Order.findOne({
            orderNumber,
        })
            .populate(['customer', 'products'])
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )

        if (!order.customer._id.equals(userId)) {
            return next(
                new NotFoundError('Заказ по заданному id отсутствует в базе')
            )
        }

        return res.status(200).json(order)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }
        return next(error)
    }
}

// POST /order
export const createOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const basket: IProduct[] = []
        const products = await Product.find<IProduct>({})
        const userId = res.locals.user._id
        const { address, payment, phone, total, email, items, comment } =
            req.body

        if (!Array.isArray(items)) {
            return next(new BadRequestError('Некорректный список товаров'))
        }

        if (typeof total !== 'number') {
            return next(new BadRequestError('Некорректная сумма заказа'))
        }

        items.forEach((id: Types.ObjectId) => {
            const product = products.find((p) => p._id.equals(id))

            if (!product) {
                throw new BadRequestError(`Товар с id ${id} не найден`)
            }

            if (product.price === null) {
                throw new BadRequestError(`Товар с id ${id} не продается`)
            }

            basket.push(product)
        })

        const totalBasket = basket.reduce((a, c) => a + c.price, 0)

        if (totalBasket !== total) {
            return next(new BadRequestError('Неверная сумма заказа'))
        }

        const newOrder = new Order({
            totalAmount: total,
            products: items,
            payment,
            phone: sanitizePhone(phone),
            email: sanitizeText(email).toLowerCase(),
            comment: sanitizeText(comment),
            customer: userId,
            deliveryAddress: sanitizeText(address),
        })

        const populateOrder = await newOrder.populate(['customer', 'products'])
        await populateOrder.save()

        return res.status(200).json(populateOrder)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }

        return next(error)
    }
}

// Update an order
export const updateOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const orderNumber = Number(req.params.orderNumber)
        const { status } = req.body
        const allowedStatuses = [
            'created',
            'pending',
            'paid',
            'processing',
            'delivering',
            'done',
            'cancelled',
        ]

        if (!Number.isFinite(orderNumber)) {
            return next(new BadRequestError('Передан не валидный номер заказа'))
        }

        if (typeof status !== 'string' || !allowedStatuses.includes(status)) {
            return next(new BadRequestError('Передан не валидный статус заказа'))
        }

        const updatedOrder = await Order.findOneAndUpdate(
            { orderNumber },
            { status },
            { new: true, runValidators: true }
        )
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
            .populate(['customer', 'products'])

        return res.status(200).json(updatedOrder)
    } catch (error) {
        if (error instanceof MongooseError.ValidationError) {
            return next(new BadRequestError(error.message))
        }

        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }

        return next(error)
    }
}

// Delete an order
export const deleteOrder = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    try {
        const orderId = req.params.id

        if (!Types.ObjectId.isValid(orderId)) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }

        const deletedOrder = await Order.findByIdAndDelete(orderId)
            .orFail(
                () =>
                    new NotFoundError(
                        'Заказ по заданному id отсутствует в базе'
                    )
            )
            .populate(['customer', 'products'])

        return res.status(200).json(deletedOrder)
    } catch (error) {
        if (error instanceof MongooseError.CastError) {
            return next(new BadRequestError('Передан не валидный ID заказа'))
        }

        return next(error)
    }
}
