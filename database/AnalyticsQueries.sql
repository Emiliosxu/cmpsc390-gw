Query 1: Items sold and Revenue 
  
SELECT 
    DESIGNER.designer_id,
    DESIGNER.brand_name,
    COUNT(CONTAINS.item_id) AS items_sold,
    SUM(CLOTHING_ITEM.price) AS total_revenue
FROM DESIGNER
JOIN CLOTHING_ITEM
    ON DESIGNER.designer_id = CLOTHING_ITEM.designer_id
JOIN CONTAINS
    ON CLOTHING_ITEM.item_id = CONTAINS.item_id
WHERE DESIGNER.designer_id = 1
GROUP BY DESIGNER.designer_id, DESIGNER.brand_name;

Query 2: Inventory Left

SELECT 
    CLOTHING_ITEM.designer_id,
    SUM(CLOTHING_ITEM.inventory) AS inventory_left
FROM CLOTHING_ITEM
WHERE CLOTHING_ITEM.designer_id = 1
GROUP BY CLOTHING_ITEM.designer_id;
