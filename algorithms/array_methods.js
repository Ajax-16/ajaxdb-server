import { bubbleSort } from "./bubble_sort.js";
import { treeSearch } from "./tree_search.js";

export default {
    insert: function(array, ...elements){
        for(let i = 0; i < elements.length; i++){
            array[array.length] = elements[i];
        }
        return true;
    },
    deleteByIndex: function(array, index){
        if(index >= 0 && index < array.length){
            for(let i = index; i < array.length-1; i++){
                array[i] = array[i+1];    
            }
            array.length = array.length -1;
            return true;
        }
        return false;
    },
    deleteByContent: function(array, content){
        let result = smthDelByContent(array, content, this.deleteByIndex);
        return result;
    },
    deleteAllByContent: function(array, content){
        let element = treeSearch(array, content);
        let result = false;
        while(element !== -1){
            smthDelByContent(array, content, this.deleteByIndex)
            element = treeSearch(array, content);
            result = true;
        }
        return result;
    },
    editByIndex: function(array, index, newElement){
        if(index >= 0 && index < array.length){
        array[index] = newElement;
        return true;
        }else{
            return false;
        }
    },
    editByContent: function(array, content, newElement){
        let result = smthEditByContent(array, content, newElement, this.editByIndex);
        return result;
    },
    editAllByContent: function(array, content, newElement){
        let element = treeSearch(array, content);
        let result = false;
        while(element !== -1){
            result = smthEditByContent(array, content, newElement, this.editByIndex)
            element = treeSearch(array, content);
        }
        return result;
    },
    sort: function(array){
        array = bubbleSort(array);
    }

}

// LOCAL

function smthDelByContent(array, content, cb){
    let element = treeSearch(array, content);
    if(element != -1){
        cb(array, element);
        return true;
    }else{
        return false;
    }
}

function smthEditByContent(array, content, newElement, cb){
    let element = treeSearch(array, content);
    if(element != -1){
        cb(array, element, newElement);
        return true;
    }else{
        return false;
    }
}