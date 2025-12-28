
/**
 * Функция для расчета выручки
 * @param purchase запись о покупке
 * @param _product карточка товара
 * @returns {number}
 */
function calculateSimpleRevenue(purchase, _product) {
   const { discount, sale_price, quantity } = purchase;
   
   if (discount && discount > 0) {
       return sale_price * quantity * (1 - discount / 100);
   }
   
   return sale_price * quantity;
} 

/**
 * Функция для расчета бонусов
 * @param index порядковый номер в отсортированном массиве
 * @param total общее число продавцов
 * @param seller карточка продавца
 * @returns {number}
 */
function calculateBonusByProfit(index, total, seller) {
   const { profit } = seller;
   
   if (index === 0) {
       return profit * 0.15;
   } else if (index < 3) {
       return profit * 0.10;
   } else if (index === total - 1) {
       return 0;
   } else {
       return profit * 0.05;
   }
}

/**
 * Функция для анализа данных продаж
 * @param data
 * @param options
 * @returns {{revenue, top_products, bonus, name, sales_count, profit, seller_id}[]}
 */
function analyzeSalesData(data, options) {
   // Проверка входящих данных согласно тестам
   if (
        !data || 
        !Array.isArray(data.sellers) || 
        data.sellers.length === 0 ||
        !Array.isArray(data.products) || 
        data.products.length === 0 ||
        !Array.isArray(data.purchase_records) || 
        data.purchase_records.length === 0
    ) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка опций
    if (
        !options || 
        typeof options !== "object" ||
        !options.calculateBonus ||
        !options.calculateRevenue ||
        typeof options.calculateRevenue !== "function" ||
        typeof options.calculateBonus !== "function"
    ) {
        throw new Error('Некорректные опции');
    }

    const { calculateRevenue, calculateBonus } = options;

    // Создаем статистику продавцов
    const sellerStats = data.sellers.map(seller => ({
        seller_id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}        
    }));

    // Создаем индекс продавцов для быстрого поиска
    const sellerIndex = {};
    sellerStats.forEach(seller => {
        sellerIndex[seller.seller_id] = seller;
    });

    // Создаем индекс товаров для быстрого поиска
    const productIndex = {};
    data.products.forEach(product => {
        productIndex[product.sku] = product;
    });

    // Обработка записей о покупках
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        
        if (!seller) {
            // Продавец не найден - пропускаем запись
            return;
        }

        // Увеличить количество продаж 
        seller.sales_count++;
        
        // Увеличить общую сумму выручки всех продаж
        seller.revenue += record.total_amount;

        // Расчёт прибыли для каждого товара
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            
            if (!product) {
                // Товар не найден - пропускаем этот товар
                return;
            }

            // Посчитать себестоимость
            const cost = product.purchase_price * item.quantity;
            
            // Посчитать выручку с учётом скидки
            const revenue = calculateRevenue(item, product);
            
            // Посчитать прибыль
            const itemProfit = revenue - cost;
            
            // Увеличить общую накопленную прибыль
            seller.profit += itemProfit;

            // Учёт количества проданных товаров
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            
            // Увеличить проданное количество
            seller.products_sold[item.sku] += item.quantity;
        });
    });


    // Сортируем продавцов по прибыли
    const sortedSellers = sellerStats.sort((a, b) => b.profit - a.profit);
    
    // Вычисляем бонусы для каждого продавца
    const totalSellers = sortedSellers.length;
    
    sortedSellers.forEach((seller, index) => {
        // Считаем бонус
        seller.bonus = calculateBonus(index, totalSellers, seller);
        
        // Формируем топ-10 товаров
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({
                sku: sku,
                quantity: quantity
            }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Возвращаем отчёт
    return sortedSellers.map(seller => ({
        seller_id: seller.seller_id,
        name: seller.name,
        revenue: +(seller.revenue.toFixed(2)),
        profit: +(seller.profit.toFixed(2)),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +(seller.bonus.toFixed(2))
    }));
}
