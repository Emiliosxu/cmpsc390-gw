TEST DATA

INSERT INTO USER (user_id, user_name, user_email, body_type, subscription_type, user_password, height_in, weight_lb) VALUES (1, 'John Smith', 'johnsmith@test.com', 'Medium', 'Free', 'hashedpass', 70, 180);

INSERT INTO DESIGNER (designer_id, brand_name, brand_email, designer_password) VALUES (1, 'UrbanStyle', 'urbanstyle@test.com', 'hashedpass');

INSERT INTO CLOTHING_ITEM (item_id, category, style, price, image_url, item_name, occasion, size_range, inventory, designer_id) VALUES (1, 'Tops', 'Casual', 49.99, 'hoodie.jpg', 'Black Hoodie', 'Casual', 42, 10, 1);

INSERT INTO SAVED_CLOSET (closet_id, user_id) VALUES (1, 1);

INSERT INTO SAVED_IN (closet_id, item_id) VALUES (1, 1);

INSERT INTO ORDERS (order_id, status, user_id) VALUES (1, 'Completed', 1);

INSERT INTO CONTAINS (order_id, item_id) VALUES (1, 1);

INSERT INTO USER_PREFERENCES (preferences, user_id) VALUES ('Casual', 1);

INSERT INTO USER (user_id, user_name, user_email, body_type, subscription_type, user_password, height_in, weight_lb) VALUES (2, 'Joe Johnson', 'joejohnson@test.com', 'Slim', 'Premium', 'hashedpass2', 72, 130);

INSERT INTO DESIGNER (designer_id, brand_name, brand_email, designer_password) VALUES (2, 'ModernFashion', 'modernfashion@test.com', 'hashedpass2');

INSERT INTO CLOTHING_ITEM (item_id, category, style, price, image_url, item_name, occasion, size_range, inventory, designer_id)
VALUES
(2, 'Pants', 'Casual', 59.99, 'pants.jpg', 'Blue Pants', 'Casual', 38, 15, 1),
(3, 'Jacket', 'Casual', 89.99, 'jacket.jpg', 'Gray Jacket', 'Casual', 40, 8, 1),
(4, 'Shirt', 'Casual', 34.99, 'shirt.jpg', 'Black Shirt', 'Everyday', 36, 20, 1),
(5, 'Shirt', 'Formal', 69.99, 'whiteshirt.jpg', 'White Shirt', 'Formal', 39, 12, 2),
(6, 'Pants', 'Formal', 79.99, 'blackpants.jpg', 'Black Pants', 'Work', 34, 9, 2),
(7, 'Coat', 'Formal', 99.99, 'coat.jpg', 'Navy Coat', 'Formal', 42, 6, 2);

INSERT INTO ORDERS (order_id, status, user_id) 
VALUES
(2, 'Completed', 1),
(3, 'Completed', 2),
(4, 'Completed', 1),
(5, 'Completed', 2);

INSERT INTO CONTAINS (order_id, item_id)
VALUES
(2, 2),
(2, 3),
(3, 1),
(3, 4),
(4, 2),
(4, 5),
(5, 6),
(5, 7);

INSERT INTO SAVED_CLOSET (closet_id, user_id) VALUES (2, 2);

INSERT INTO SAVED_IN (closet_id, item_id) VALUES (2, 5), (2, 6);

INSERT INTO USER_PREFERENCES (preferences, user_id) VALUES ('Casual', 2);
