import express from 'express';
import { container } from '../../di/DIContainer';
import { ErrorHandler } from '../../utils/ErrorHandler';

const router = express.Router();
const orderController = container.getOrderController();

router.post('/', ErrorHandler.asyncHandler(orderController.create));
router.get('/', ErrorHandler.asyncHandler(orderController.getAll));
router.put('/:id', ErrorHandler.asyncHandler(orderController.update));
router.delete('/:id', ErrorHandler.asyncHandler(orderController.delete));

export default router;
