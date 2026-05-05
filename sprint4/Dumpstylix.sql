-- MySQL dump 10.13  Distrib 8.0.44, for Win64 (x86_64)
--
-- Host: 127.0.0.1    Database: stylix
-- ------------------------------------------------------
-- Server version	8.4.8

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `clothing_item`
--

DROP TABLE IF EXISTS `clothing_item`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `clothing_item` (
  `item_id` int NOT NULL,
  `category` varchar(255) NOT NULL,
  `style` varchar(255) NOT NULL,
  `price` decimal(10,2) NOT NULL,
  `image_url` varchar(255) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `description` text,
  `occasion` varchar(255) DEFAULT NULL,
  `size_range` int NOT NULL,
  `inventory` int NOT NULL,
  `designer_id` int NOT NULL,
  PRIMARY KEY (`item_id`),
  KEY `designer_id` (`designer_id`),
  CONSTRAINT `clothing_item_ibfk_1` FOREIGN KEY (`designer_id`) REFERENCES `designer` (`designer_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `clothing_item`
--

LOCK TABLES `clothing_item` WRITE;
/*!40000 ALTER TABLE `clothing_item` DISABLE KEYS */;
INSERT INTO `clothing_item` VALUES (1,'Tops','Casual',49.99,'hoodie.jpg','Black Hoodie',NULL,'Casual',42,10,1),(2,'Pants','Casual',59.99,'pants.jpg','Blue Pants',NULL,'Casual',38,15,1),(3,'Jacket','Casual',89.99,'jacket.jpg','Gray Jacket',NULL,'Casual',40,8,1),(4,'Shirt','Casual',34.99,'shirt.jpg','Black Shirt',NULL,'Everyday',36,20,1),(5,'Shirt','Formal',69.99,'whiteshirt.jpg','White Shirt',NULL,'Formal',39,12,2),(6,'Pants','Formal',79.99,'blackpants.jpg','Black Pants',NULL,'Work',34,9,2),(7,'Coat','Formal',99.99,'coat.jpg','Navy Coat',NULL,'Formal',42,6,2),(8,'long_sleeve','Casual',39.99,'kikoLs.jpg','SARGO LONG SLEEVE HENLEY',NULL,'Casual',38,16,3),(9,'Pants','Casual',149.99,'kikotrousers.jpg','KOMLO TROUSER',NULL,'Casual',44,8,3),(10,'Jacket','Formal',157.99,'tailoredjacketkiko.jpg','CSOMOR TAILORED JACKET',NULL,'Formal',46,20,3),(11,'Shirt','Casual',369.99,'wertmullerJacketkiko.jpg','WERTMÜLLER JACKET',NULL,'Casual',34,12,3),(12,'Dress','Formal',479.99,'knitdresskiko.jpg','LEMOYNE KNITTED DRESS',NULL,'Formal',34,9,3),(13,'Pants','Formal',979.99,'statsingercoatkiko.jpg','STATSINGER COAT',NULL,'Formal',36,9,3),(14,'Coat','Formal',69.99,'centrouserskiko.jpg','CENTENNIAL TROUSER',NULL,'Formal',38,6,3),(15,'loafers','Casual',139.99,'kikoss.jpg','Kiko Kostadinov x Dr. Martens Strap Shoe',NULL,'Casual',11,3,3),(16,'low cut boot','Formal',149.99,'atrolace.jpg','ATRO LACE UPS',NULL,'Formal',9,8,3),(17,'boot','Formal',67.99,'fbootskiko.jpg','FARKAS BOOTS',NULL,'Formal',8,10,3),(18,'shoe','Casual',89.99,'ktrainers.jpg','KOMLO TRAINERS',NULL,'Casual',6,12,3),(19,'Dress','Formal',479.99,'sshoek.jpg','SARGO SHOES',NULL,'Casual',7,9,3),(20,'Pants','Formal',979.99,'lhcshoek.jpg','LELLA HYBRID',NULL,'Casual',5,9,3);
/*!40000 ALTER TABLE `clothing_item` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `contains`
--

DROP TABLE IF EXISTS `contains`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `contains` (
  `order_id` int NOT NULL,
  `item_id` int NOT NULL,
  PRIMARY KEY (`order_id`,`item_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `contains_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`order_id`),
  CONSTRAINT `contains_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `clothing_item` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `contains`
--

LOCK TABLES `contains` WRITE;
/*!40000 ALTER TABLE `contains` DISABLE KEYS */;
INSERT INTO `contains` VALUES (1,1),(3,1),(2,2),(4,2),(2,3),(3,4),(4,5),(5,6),(5,7);
/*!40000 ALTER TABLE `contains` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `designer`
--

DROP TABLE IF EXISTS `designer`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `designer` (
  `designer_id` int NOT NULL,
  `brand_name` varchar(255) NOT NULL,
  `brand_email` varchar(255) NOT NULL,
  `designer_password` varchar(255) NOT NULL,
  PRIMARY KEY (`designer_id`),
  UNIQUE KEY `brand_email` (`brand_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `designer`
--

LOCK TABLES `designer` WRITE;
/*!40000 ALTER TABLE `designer` DISABLE KEYS */;
INSERT INTO `designer` VALUES (1,'UrbanStyle','urbanstyle@test.com','hashedpass'),(2,'ModernFashion','modernfashion@test.com','hashedpass2'),(3,'Kiko Kostadinov','shop@kikokostadinov.com','kikoK'),(4,'Closet customs','custom@gmail.com','1234');
/*!40000 ALTER TABLE `designer` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `order_id` int NOT NULL,
  `status` varchar(255) NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`order_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
INSERT INTO `orders` VALUES (1,'Completed',1),(2,'Completed',1),(3,'Completed',2),(4,'Completed',1),(5,'Completed',2);
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saved_closet`
--

DROP TABLE IF EXISTS `saved_closet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saved_closet` (
  `closet_id` int NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`closet_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `saved_closet_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_closet`
--

LOCK TABLES `saved_closet` WRITE;
/*!40000 ALTER TABLE `saved_closet` DISABLE KEYS */;
INSERT INTO `saved_closet` VALUES (1,1),(2,2),(3,3),(4,4),(5,5);
/*!40000 ALTER TABLE `saved_closet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `saved_in`
--

DROP TABLE IF EXISTS `saved_in`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `saved_in` (
  `closet_id` int NOT NULL,
  `item_id` int NOT NULL,
  PRIMARY KEY (`closet_id`,`item_id`),
  KEY `item_id` (`item_id`),
  CONSTRAINT `saved_in_ibfk_1` FOREIGN KEY (`closet_id`) REFERENCES `saved_closet` (`closet_id`),
  CONSTRAINT `saved_in_ibfk_2` FOREIGN KEY (`item_id`) REFERENCES `clothing_item` (`item_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `saved_in`
--

LOCK TABLES `saved_in` WRITE;
/*!40000 ALTER TABLE `saved_in` DISABLE KEYS */;
INSERT INTO `saved_in` VALUES (5,1),(3,2),(4,2),(3,3),(4,3),(1,4),(3,4),(4,4),(1,5),(2,5),(2,6),(5,7),(1,8),(5,12),(1,15),(1,19),(1,20);
/*!40000 ALTER TABLE `saved_in` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user`
--

DROP TABLE IF EXISTS `user`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user` (
  `user_id` int NOT NULL,
  `user_name` varchar(100) NOT NULL,
  `user_email` varchar(100) NOT NULL,
  `body_type` varchar(100) NOT NULL,
  `subscription_type` varchar(100) DEFAULT NULL,
  `user_password` varchar(255) NOT NULL,
  `height_in` int NOT NULL,
  `weight_lb` int NOT NULL,
  PRIMARY KEY (`user_id`),
  UNIQUE KEY `user_email` (`user_email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user`
--

LOCK TABLES `user` WRITE;
/*!40000 ALTER TABLE `user` DISABLE KEYS */;
INSERT INTO `user` VALUES (1,'John Smith','johnsmith@test.com','Medium','Free','hashedpass',70,180),(2,'Joe Johnson','joejohnson@test.com','Slim','Premium','hashedpass2',72,130),(3,'Emi','user2@email.com','Medium','Premium','123456@',71,152),(4,'Rami','Rami@email.com','Medium','Free','12345',70,180),(5,'ken1','ken@gmail.com','Slim','Free','Ken',70,180);
/*!40000 ALTER TABLE `user` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_preferences`
--

DROP TABLE IF EXISTS `user_preferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_preferences` (
  `preferences` varchar(255) NOT NULL,
  `user_id` int NOT NULL,
  PRIMARY KEY (`preferences`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `user_preferences_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `user` (`user_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_preferences`
--

LOCK TABLES `user_preferences` WRITE;
/*!40000 ALTER TABLE `user_preferences` DISABLE KEYS */;
INSERT INTO `user_preferences` VALUES ('Casual',1);
/*!40000 ALTER TABLE `user_preferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'stylix'
--

--
-- Dumping routines for database 'stylix'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-04-10 17:41:44
