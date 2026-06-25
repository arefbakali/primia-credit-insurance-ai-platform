const express = require('express');
const router = express.Router();
const quoteController = require('../controllers/quoteController');
const quoteGenerationController = require('../controllers/quoteGenerationController');
const { authenticate, requireAdmin } = require('../middleware/authMiddleware');

// Quote generation pipeline (new)
router.post('/generate', authenticate, quoteGenerationController.upload.single('bank_report'), quoteGenerationController.generateQuote);
router.get('/complete', authenticate, quoteGenerationController.getQuotesComplete);
router.get('/complete/:id', authenticate, quoteGenerationController.getQuoteComplete);

// Quote management routes
router.post('/request', authenticate, quoteController.upload.single('bank_report'), quoteController.requestQuote);
router.get('/', authenticate, quoteController.getQuotes);
router.get('/:id', authenticate, quoteController.getQuote);
router.put('/:id', authenticate, requireAdmin, quoteController.updateQuote);
router.post('/:id/confirm', authenticate, requireAdmin, quoteController.confirmQuote);
router.get('/:id/download', authenticate, quoteController.downloadQuote);

module.exports = router;
