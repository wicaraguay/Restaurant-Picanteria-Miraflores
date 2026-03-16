import express from 'express';
import { container } from '../../di/DIContainer';
import { ErrorHandler } from '../../utils/ErrorHandler';

const router = express.Router();
const customerController = container.getCustomerController();

router.post('/', ErrorHandler.asyncHandler(customerController.create));
router.get('/', ErrorHandler.asyncHandler(customerController.getAll));
router.get('/lookup/:identification', ErrorHandler.asyncHandler(customerController.lookup));
router.put('/:id', ErrorHandler.asyncHandler(customerController.update));
router.delete('/:id', ErrorHandler.asyncHandler(customerController.delete));

export default router;
