import { bubbleSort } from "./bubble_sort.js";

export function treeSearch(array, search) {
    let menor = 0;
    let mayor = array.length - 1;
    let arrayCopy = [...array];
    arrayCopy = bubbleSort(arrayCopy);

    while (menor <= mayor) {
        let middle = Math.trunc((menor + mayor) / 2);

        if (arrayCopy[middle] === search) {
            return array.indexOf(arrayCopy[middle]);
        } else if (arrayCopy[middle] < search) {
            menor = middle + 1;
        } else {
            mayor = middle - 1;
        }

    }

    return -1;
}