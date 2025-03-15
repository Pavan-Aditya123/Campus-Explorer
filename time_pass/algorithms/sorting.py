def merge_sort(arr, key_func=lambda x: x, reverse=False):
    """
    Implements the Merge Sort algorithm.
    
    Args:
        arr: Array to be sorted
        key_func: Function to extract the comparison key
        reverse: Whether to sort in descending order
        
    Returns:
        Sorted array
    """
    if len(arr) <= 1:
        return arr
    
    # Split the array into two halves
    mid = len(arr) // 2
    left = merge_sort(arr[:mid], key_func, reverse)
    right = merge_sort(arr[mid:], key_func, reverse)
    
    # Merge the two halves
    return merge(left, right, key_func, reverse)

def merge(left, right, key_func, reverse):
    """
    Merges two sorted arrays.
    
    Args:
        left: First sorted array
        right: Second sorted array
        key_func: Function to extract the comparison key
        reverse: Whether to sort in descending order
        
    Returns:
        Merged sorted array
    """
    result = []
    i = j = 0
    
    while i < len(left) and j < len(right):
        left_key = key_func(left[i])
        right_key = key_func(right[j])
        
        if (left_key < right_key and not reverse) or (left_key > right_key and reverse):
            result.append(left[i])
            i += 1
        else:
            result.append(right[j])
            j += 1
    
    # Add remaining elements
    result.extend(left[i:])
    result.extend(right[j:])
    
    return result

def quick_sort(arr, key_func=lambda x: x, reverse=False):
    """
    Implements the Quick Sort algorithm.
    
    Args:
        arr: Array to be sorted
        key_func: Function to extract the comparison key
        reverse: Whether to sort in descending order
        
    Returns:
        Sorted array
    """
    if len(arr) <= 1:
        return arr
    
    # Make a copy to avoid modifying the original array
    arr_copy = arr.copy()
    _quick_sort_helper(arr_copy, 0, len(arr_copy) - 1, key_func, reverse)
    return arr_copy

def _quick_sort_helper(arr, low, high, key_func, reverse):
    """
    Helper function for Quick Sort.
    
    Args:
        arr: Array to be sorted
        low: Starting index
        high: Ending index
        key_func: Function to extract the comparison key
        reverse: Whether to sort in descending order
    """
    if low < high:
        # Partition the array
        pivot_index = _partition(arr, low, high, key_func, reverse)
        
        # Sort the sub-arrays
        _quick_sort_helper(arr, low, pivot_index - 1, key_func, reverse)
        _quick_sort_helper(arr, pivot_index + 1, high, key_func, reverse)

def _partition(arr, low, high, key_func, reverse):
    """
    Partitions the array for Quick Sort.
    
    Args:
        arr: Array to be partitioned
        low: Starting index
        high: Ending index
        key_func: Function to extract the comparison key
        reverse: Whether to sort in descending order
        
    Returns:
        Pivot index
    """
    # Choose the rightmost element as pivot
    pivot = key_func(arr[high])
    i = low - 1
    
    for j in range(low, high):
        current = key_func(arr[j])
        
        if (current <= pivot and not reverse) or (current >= pivot and reverse):
            i += 1
            arr[i], arr[j] = arr[j], arr[i]
    
    # Place the pivot in its correct position
    arr[i + 1], arr[high] = arr[high], arr[i + 1]
    
    return i + 1 