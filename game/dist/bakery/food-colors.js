/** One served-drink palette, shared by Dormi's cup and a friend's cup. */
export const FOOD_LIQUID_COLORS=Object.freeze({americano:'#5b3929',latte:'#d2a879',appleJuice:'#e9b352',strawberryJuice:'#dc7773',peachJuice:'#efb18c',pearJuice:'#e7d9a0',mandarinJuice:'#eda246'});
export const drinkLiquidColor=id=>Object.hasOwn(FOOD_LIQUID_COLORS,id)?FOOD_LIQUID_COLORS[id]:FOOD_LIQUID_COLORS.americano;
