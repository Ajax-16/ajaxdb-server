export function bubbleSort(array){
    
    let arrayCopy = [...array];

    for(let i = 0; i < arrayCopy.length; i++){
    
        for(let j = 0; j < arrayCopy.length; j++){
    
            if(arrayCopy[i]<arrayCopy[j]){
                let larger = arrayCopy[i];
                let smaller = arrayCopy[j];
                arrayCopy[j] = larger;
                arrayCopy[i] = smaller;
            }

        }
    
    }

    return arrayCopy;

}