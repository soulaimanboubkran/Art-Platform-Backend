import { Request, Response, NextFunction } from 'npm:express';
import { validationResult } from 'npm:express-validator';

export const validateRequest = (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
    }
    next();
};

// Custom middleware to check for additional fields
export const checkForUnexpectedFields = (allowedFields: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const extraFields = Object.keys(req.body).filter(key => !allowedFields.includes(key));
        if (extraFields.length > 0) {
            return res.status(400).json({
                success: false,
                message: `Unexpected fields: ${extraFields.join(', ')}`,
            });
        }
        next();
    };
};
