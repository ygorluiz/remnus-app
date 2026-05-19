-- Migration 0007: Add password_hash column to user table for credentials auth
ALTER TABLE `user` ADD COLUMN `password_hash` text;
