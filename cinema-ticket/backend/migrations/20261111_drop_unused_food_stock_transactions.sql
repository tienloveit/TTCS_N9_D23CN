-- Run with the intended database selected. Back up the table before applying.
-- The current application updates inventory directly in foods.stock_quantity.
-- This legacy stock-history table is no longer mapped or used by the backend.
DROP TABLE IF EXISTS food_stock_transactions;
