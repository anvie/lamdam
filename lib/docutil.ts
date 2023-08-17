

export function toApiRespDoc(doc: any): any {
    let _doc = doc;
    if (doc.toJSON){
        _doc = doc.toJSON();
    }
    _doc.id = _doc['_id']
    delete _doc['_id']
    return _doc;
}