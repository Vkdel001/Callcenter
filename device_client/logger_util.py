"""
Logging utility for NIC Device Client
"""

import logging
import sys
from logging.handlers import RotatingFileHandler
from datetime import datetime

def setup_logger(config):
    """Setup logger with file and console handlers"""
    
    # Create logger
    logger = logging.getLogger('NICDeviceClient')
    logger.setLevel(getattr(logging, config.log_level))
    
    # Remove existing handlers
    logger.handlers = []
    
    # Create formatters
    detailed_formatter = logging.Formatter(
        '%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        datefmt='%Y-%m-%d %H:%M:%S'
    )
    
    simple_formatter = logging.Formatter(
        '%(asctime)s - %(levelname)s - %(message)s',
        datefmt='%H:%M:%S'
    )
    
    # File handler (rotating)
    try:
        file_handler = RotatingFileHandler(
            config.log_file,
            maxBytes=config.log_max_size,
            backupCount=config.log_backup_count
        )
        file_handler.setLevel(logging.DEBUG)
        file_handler.setFormatter(detailed_formatter)
        logger.addHandler(file_handler)
    except Exception as e:
        print(f"Warning: Could not create log file: {e}")
    
    # Console handler
    console_handler = logging.StreamHandler(sys.stdout)
    console_handler.setLevel(logging.INFO)
    console_handler.setFormatter(simple_formatter)
    logger.addHandler(console_handler)
    
    # Log startup
    logger.info("=" * 60)
    logger.info("NIC Device Client Logger Initialized")
    logger.info(f"Log file: {config.log_file}")
    logger.info(f"Log level: {config.log_level}")
    logger.info("=" * 60)
    
    return logger
