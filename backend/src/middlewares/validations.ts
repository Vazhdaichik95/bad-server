import { Joi, celebrate, Segments } from 'celebrate'
import { Types } from 'mongoose'

// eslint-disable-next-line no-useless-escape
export const phoneRegExp = /^(\+\d+)?(?:\s|-?|\(?\d+\)?)+$/

export enum PaymentType {
    Card = 'card',
    Online = 'online',
}

const objectIdValidator = (value: string, helpers: Joi.CustomHelpers) => {
    if (Types.ObjectId.isValid(value)) {
        return value
    }

    return helpers.message({ custom: 'Невалидный id' })
}

export const validateOrderBody = celebrate({
    [Segments.BODY]: Joi.object({
        items: Joi.array()
            .items(Joi.string().required().custom(objectIdValidator))
            .min(1)
            .required()
            .messages({
                'array.base': 'Некорректный список товаров',
                'array.empty': 'Не указаны товары',
                'array.min': 'Не указаны товары',
                'any.required': 'Не указаны товары',
            }),
        payment: Joi.string()
            .valid(...Object.values(PaymentType))
            .required()
            .messages({
                'string.valid':
                    'Указано не валидное значение для способа оплаты, возможные значения - "card", "online"',
                'any.only':
                    'Указано не валидное значение для способа оплаты, возможные значения - "card", "online"',
                'string.empty': 'Не указан способ оплаты',
                'any.required': 'Не указан способ оплаты',
            }),
        email: Joi.string().email().max(100).required().messages({
            'string.email': 'Поле "email" должно быть валидным email-адресом',
            'string.empty': 'Не указан email',
            'any.required': 'Не указан email',
        }),
        phone: Joi.string()
            .pattern(phoneRegExp)
            .min(5)
            .max(20)
            .required()
            .messages({
                'string.empty': 'Не указан телефон',
                'string.pattern.base': 'Некорректный телефон',
                'any.required': 'Не указан телефон',
            }),
        address: Joi.string().trim().min(3).max(200).required().messages({
            'string.empty': 'Не указан адрес',
            'any.required': 'Не указан адрес',
        }),
        total: Joi.number().min(0).required().messages({
            'number.base': 'Не указана сумма заказа',
            'any.required': 'Не указана сумма заказа',
        }),
        comment: Joi.string().trim().max(500).optional().allow(''),
    }).unknown(false),
})

export const validateProductBody = celebrate({
    [Segments.BODY]: Joi.object({
        title: Joi.string().trim().required().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "title" - 2',
            'string.max': 'Максимальная длина поля "title" - 30',
            'string.empty': 'Поле "title" должно быть заполнено',
            'any.required': 'Поле "title" должно быть заполнено',
        }),
        image: Joi.object({
            fileName: Joi.string().trim().required(),
            originalName: Joi.string().trim().required(),
        }).optional(),
        category: Joi.string().trim().required().max(50).messages({
            'string.empty': 'Поле "category" должно быть заполнено',
            'any.required': 'Поле "category" должно быть заполнено',
        }),
        description: Joi.string().trim().required().max(3000).messages({
            'string.empty': 'Поле "description" должно быть заполнено',
            'any.required': 'Поле "description" должно быть заполнено',
        }),
        price: Joi.number().min(0).allow(null),
    }).unknown(false),
})

export const validateProductUpdateBody = celebrate({
    [Segments.BODY]: Joi.object({
        title: Joi.string().trim().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "title" - 2',
            'string.max': 'Максимальная длина поля "title" - 30',
        }),
        image: Joi.object({
            fileName: Joi.string().trim().required(),
            originalName: Joi.string().trim().required(),
        }).optional(),
        category: Joi.string().trim().max(50),
        description: Joi.string().trim().max(3000),
        price: Joi.number().min(0).allow(null),
    })
        .min(1)
        .unknown(false),
})

export const validateObjId = celebrate({
    [Segments.PARAMS]: Joi.object({
        productId: Joi.string().required().custom(objectIdValidator),
    }).unknown(false),
})

export const validateUserBody = celebrate({
    [Segments.BODY]: Joi.object({
        name: Joi.string().trim().min(2).max(30).messages({
            'string.min': 'Минимальная длина поля "name" - 2',
            'string.max': 'Максимальная длина поля "name" - 30',
        }),
        password: Joi.string().min(6).max(100).required().messages({
            'string.empty': 'Поле "password" должно быть заполнено',
            'any.required': 'Поле "password" должно быть заполнено',
        }),
        email: Joi.string()
            .trim()
            .required()
            .email()
            .max(100)
            .message('Поле "email" должно быть валидным email-адресом')
            .messages({
                'string.empty': 'Поле "email" должно быть заполнено',
                'any.required': 'Поле "email" должно быть заполнено',
            }),
    }).unknown(false),
})

export const validateAuthentication = celebrate({
    [Segments.BODY]: Joi.object({
        email: Joi.string()
            .trim()
            .required()
            .email()
            .max(100)
            .message('Поле "email" должно быть валидным email-адресом')
            .messages({
                'string.required': 'Поле "email" должно быть заполнено',
                'string.empty': 'Поле "email" должно быть заполнено',
                'any.required': 'Поле "email" должно быть заполнено',
            }),
        password: Joi.string().required().max(100).messages({
            'string.empty': 'Поле "password" должно быть заполнено',
            'any.required': 'Поле "password" должно быть заполнено',
        }),
    }).unknown(false),
})
