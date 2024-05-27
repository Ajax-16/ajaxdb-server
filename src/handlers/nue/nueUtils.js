import { clean, retainSplit } from "../../utils/string.js";

export function getConditions(conditionStatement) {
    let conditionsArray = retainSplit(conditionStatement, /\s+AND\s+/ui, /\s+OR\s+/ui)
    const conditions = []
    for (let i = 0; i < conditionsArray.length; i++) {
        if (conditionsArray[i].toUpperCase() === 'AND') {
            const completeCondition = conditionsArray[i + 1].match(/^(\w+\.\w+|\w+)\s*(=|!=|>|<|>=|<=|\s+LIKE\s+|\s+ILIKE\s+|\s+NOT\s+LIKE\s+|\s+NOT\s+ILIKE\s+|IN|\s+NOT\s+IN\s+)\s*((?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?:\s*['"]?[%]?[\w]+[%]?['"]?|\d*\.?\d*)))$/ui)
            let condition = completeCondition[1]
            let operator = completeCondition[2].trim();
            let conditionValue = clean(completeCondition[3])

            if (condition === 'PRIMARY_KEY') {
                condition = undefined;
            }
            if (operator) {
                if (operator.toUpperCase() === 'IN' || operator.toUpperCase() === 'NOT IN') {

                    conditionValue = completeCondition[3].replace(/\(|\)/g, '').split(',').map(value => clean(value.trim()));

                } else {
                    conditionValue = clean(completeCondition[3]);
                }
            }

            conditions.push({
                logicalOperator: 'AND',
                condition,
                operator,
                conditionValue
            })
            i++;
        } else if (conditionsArray[i].toUpperCase() === 'OR') {
            const completeCondition = conditionsArray[i + 1].match(/^(\w+\.\w+|\w+)\s*(=|!=|>|<|>=|<=|\s+LIKE\s+|\s+ILIKE\s+|\s+NOT\s+LIKE\s+|\s+NOT\s+ILIKE\s+|IN|\s+NOT\s+IN\s+)\s*((?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?:\s*['"]?[%]?[\w]+[%]?['"]?|\d*\.?\d*)))$/ui)
            let condition = completeCondition[1]
            let operator = completeCondition[2].trim();
            let conditionValue = clean(completeCondition[3])
            if (condition === 'PRIMARY_KEY') {
                condition = undefined;
            }
            if (operator) {
                if (operator.toUpperCase() === 'IN' || operator.toUpperCase() === 'NOT IN') {

                    conditionValue = completeCondition[3].replace(/\(|\)/g, '').split(',').map(value => clean(value.trim()));
                } else {
                    conditionValue = clean(completeCondition[3]);
                }
            }

            conditions.push({
                logicalOperator: 'OR',
                condition,
                operator,
                conditionValue,
            })
            i++;
        } else {
            const completeCondition = conditionsArray[i].match(/^(\w+\.\w+|\w+)\s*(=|!=|>|<|>=|<=|\s+LIKE\s+|\s+ILIKE\s+|\s+NOT\s+LIKE\s+|\s+NOT\s+ILIKE\s+|IN|\s+NOT\s+IN\s+)\s*((?:\(\s*['"]?[\w\s,]+['"]?(?:\s*,\s*['"]?[\w\s,]+['"]?|\d*\.?\d*)*\s*\)|(?:\s*['"]?[%]?[\w]+[%]?['"]?|\d*\.?\d*)))$/ui)
            let condition = completeCondition[1]
            let operator = completeCondition[2].trim();
            let conditionValue = clean(completeCondition[3])
            if (condition === 'PRIMARY_KEY') {
                condition = undefined;
            }
            if (operator) {
                if (operator.toUpperCase() === 'IN' || operator.toUpperCase() === 'NOT IN') {

                    conditionValue = completeCondition[3].replace(/\(|\)/g, '').split(',').map(value => clean(value.trim()));

                } else {
                    conditionValue = clean(completeCondition[3]);
                }
            }

            conditions.push({
                condition,
                operator,
                conditionValue
            })
        }
    }
    return conditions;
}

export function parsePrivs(privs) {
    const finalPrivs = [false, false, false, false];

    for(const priv of privs) {
        switch(priv) {
            case 'c':
                finalPrivs[0] = true;
            break;
            case 'r':
                finalPrivs[1] = true;
            break;
            case 'u':
                finalPrivs[2] = true;
            break;
            case 'd':
                finalPrivs[3] = true;
            break;
        }
    }

    return finalPrivs;

}