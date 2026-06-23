import { existsSync, mkdirSync, rename } from 'fs'
import path from 'path'

const SAFE_FILE_NAME = /^[a-zA-Z0-9._-]{1,255}$/

const resolveInsideDir = (baseDir: string, fileName: string): string => {
    const absoluteBaseDir = path.resolve(baseDir)
    const safeFileName = path.basename(fileName)
    const absoluteTarget = path.resolve(absoluteBaseDir, safeFileName)
    const relative = path.relative(absoluteBaseDir, absoluteTarget)

    if (relative.startsWith('..') || path.isAbsolute(relative)) {
        throw new Error('Некорректный путь к файлу')
    }

    return absoluteTarget
}

function movingFile(imagePath: string, from: string, to: string) {
    const fileName = path.basename(imagePath)

    if (!SAFE_FILE_NAME.test(fileName)) {
        throw new Error('Некорректное имя файла')
    }

    mkdirSync(to, { recursive: true })

    const imagePathTemp = resolveInsideDir(from, fileName)
    const imagePathPermanent = resolveInsideDir(to, fileName)

    if (!existsSync(imagePathTemp)) {
        throw new Error('Ошибка при сохранении файла')
    }

    rename(imagePathTemp, imagePathPermanent, (err) => {
        if (err) {
            throw new Error('Ошибка при сохранении файла')
        }
    })
}

export default movingFile
