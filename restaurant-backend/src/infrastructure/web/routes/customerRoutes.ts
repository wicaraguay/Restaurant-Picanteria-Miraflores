import express from 'express';
import { container } from '../../di/DIContainer';
import { ErrorHandler } from '../../utils/ErrorHandler';

const router = express.Router();
const customerController = container.getCustomerController();

router.post('/', ErrorHandler.asyncHandler(customerController.create));
router.get('/', ErrorHandler.asyncHandler(customerController.getAll));

export default router;
