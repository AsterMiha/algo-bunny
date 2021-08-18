class Editor {
  #tile_width;
  #tile_height;
  #scale_factor;
  #height_shift;

  #width_add;
  #height_add;

  constructor(target,commands) { //{{{
    this.commands = commands;
    this.target = target;

    let t1 = $X('<g element-group="graph" xmlns="http://www.w3.org/2000/svg"></g>');
    let t2 = $X('<g element-group="drop"  xmlns="http://www.w3.org/2000/svg"></g>');
    target.append(t1);
    target.append(t2);

    this.target_graph = t1;
    this.target_drop = t2;

    this.#tile_width = 26.4;
    this.#tile_height = 27;
    this.#scale_factor = 2.21;
    this.#height_shift = 10;

    this.#width_add = this.#tile_width + 12;
    this.#height_add = this.#tile_height + 8;

    this.program = [
      ["a1", "forward"],
      ["a2", "forward"],
      ["a3", {
        "item": "if_smaller",
        "first": [
          ["a4", "forward"],
          ["a5", {
            "item": "loop",
            "first": [
              ["a8", "forward"]
            ]
          }]
        ],
        "second": []
      }],
      ["a6", {
        "item": "loop",
        "first": []
      }]
    ]
  }  //}}}

  #draw_asset(id,what,x,y,op,shift_y=0) { //{{{
    let item = this.commands.placeholders[what];
    let grax = item.graphics['icon'].clone();
    let g2 = $X('<g element-type="' + what + '" element-op="' + op  + '" element-id="' + id  + '" transform="scale(' + this.#scale_factor + ',' + this.#scale_factor + ') translate(' + ((x-1) * this.#tile_width) + ',' + ((y-1) * this.#tile_height + shift_y) + ')" xmlns="http://www.w3.org/2000/svg"></g>');
        g2.append(grax);
    this.target_drop.append(g2);
  } //}}}

  #draw(id,i,x,y,what,parent) { //{{{
    if (typeof(i) == 'object') {
      i = i.item;
    }
    let item = this.commands.items[i];
    let grax = item.graphics[what].clone();
    let g1 = $X('<g draggable="true" class="element" element-type="' + i + '" element-id="' + id  + '" xmlns="http://www.w3.org/2000/svg"></g>');
    let g2 = $X('<g transform="scale(' + this.#scale_factor + ',' + this.#scale_factor + ') translate(' + ((x-1) * this.#tile_width) + ',' + ((y-1) * this.#tile_height) + ')" xmlns="http://www.w3.org/2000/svg"></g>');
        g2.append(grax);
        g1.append(g2);
    if (parent) {
      let tar = this.target_graph.find('g[element-id=' + parent + ']');
      if (id == parent) {
        tar.append(g2);
      } else {
        tar.append(g1);
      }
    } else {
      this.target_graph.append(g1);
    }
  } //}}}

  #iter(it,x,y,parent) { //{{{
    let width = x == 0 ? 1 : x;
    for (const [k,v] of it) {
      if (typeof(v) == 'string' || (typeof(v) == 'object' && !('first' in v))) {
        y += 1;
        this.#draw(k,v,x,y,'icon',parent);
        this.#draw_asset(k,'add',x,y,'after',this.#tile_height/2);
        this.#draw_asset(k,'delete',x,y,'at');
      }  else {
        let [l,w] = this.#dig(k,v,x,y,parent);
        y = l;
        if (w > width) { width = w; }
      }
    }
    return [y,width];
  } //}}}
  #dig(id,sub,x,y,parent) { //{{{
    let width = x;
    y += 1;
    this.#draw(id,sub.item,x,y,'first',parent);
    this.#draw(id,sub.item,x,y,'first_icon',id);
    this.#draw_asset(id,'delete',x+1,y,'at');
    if (sub.first) {
      this.#draw_asset(id,'add',x+1,y,'insert_first',this.#tile_height/2);
      let [dy, w] = this.#iter(sub.first,x+1,y,id);
      for (let i = y+1; i <= dy; i++) {
        this.#draw(id,sub.item,x,i,'middle',id);
      }
      y = dy;
      if (w > width) { width = w; }
    }
    if (sub.second) {
      y += 1;
      this.#draw(id,sub.item,x,y,'second',id);
      this.#draw(id,sub.item,x,y,'second_icon',id);
      this.#draw_asset(id,'add',x+1,y,'insert_second',this.#tile_height/2);
      let [dy, w] = this.#iter(sub.second,x+1,y,id);
      for (let i = y+1; i <= dy; i++) {
        this.#draw(id,sub.item,x,i,'middle',id);
      }
      y = dy;
      if (w > width) { width = w; }
    }
    y += 1;
    this.#draw(id,sub.item,x,y,'end',id);
    this.#draw_asset(id,'add',x,y,'after',this.#tile_height/2);
    return [y,width];
  } //}}}

  #remove_item_rec(it,eid){ //{{{
    let newp = []
    for (const [k,v] of it) {
      if (k != eid) {
        newp.push([k,v]);
      }
      if (typeof(v) == 'object') {
        if (v.first) {
          v.first = this.#remove_item_rec(v.first,eid);
        }
        if (v.second) {
          v.second = this.#remove_item_rec(v.second,eid);
        }
      }
    }
    return newp;
  } //}}}
  remove_item(eid) { //{{{
    this.program = this.#remove_item_rec(this.program,eid);
  } //}}}

  clear() { //{{{
    this.target_graph.empty();
    this.target_drop.empty();
  } //}}}

  #insert_rec_item(ety) { //{{{
    let item = this.commands.items[ety];
    if (item.type == 'simple') {
      return ety;
    }
    if (item.type == 'complex_one') {
      return { "item": ety, "first": [] };
    }
    if (item.type == 'complex_two') {
      return { "item": ety, "first": [], "second": [] };
    }
    if (item.type == 'position') {
      return { "item": ety, "parameter": "" };
    }
  } //}}}
  #newid_rec(it) { //{{{
    let ids = [];
    for (const [k,v] of it) {
      ids.push(parseInt(k.replace(/^\w/,'')));
      if (typeof(v) == 'object') {
        if (v.first) {
          ids = ids.concat(this.#newid_rec(v.first));
        }
        if (v.second) {
          ids = ids.concat(this.#newid_rec(v.second));
        }
      }

    }
    return ids;
  } //}}}
  #newid(){ //{{{
    let ids = this.#newid_rec(this.program);
    return "a" + (_.max(ids) + 1);
  } //}}}
  #insert_rec(it,eid,eop,ety) { //{{{
    let newp = [];
    for (const [k,v] of it) {
      newp.push([k,v]);
      if (k == eid) {
        if (eop == 'after') {
          newp.push([this.#newid(),this.#insert_rec_item(ety)]);
        }
        if (eop == 'insert_first') {
          v.first.unshift([this.#newid(),this.#insert_rec_item(ety)]);
        }
        if (eop == 'insert_second') {
          v.second.unshift([this.#newid(),this.#insert_rec_item(ety)]);
        }
      }
      if (typeof(v) == 'object') {
        if (v.first) {
          v.first = this.#insert_rec(v.first,eid,eop,ety);
        }
        if (v.second) {
          v.second = this.#insert_rec(v.second,eid,eop,ety);
        }
      }
    }
    return newp;
  } //}}}
  insert_item(eid,eop,ety) { //{{{
    if (eid == '' && eop == 'insert_first') {
      this.program.unshift([this.#newid(),this.#insert_rec_item(ety)]);
    } else {
      this.program = this.#insert_rec(this.program,eid,eop,ety);
    }
  } //}}}

  render() {
    this.clear();
    this.#draw_asset('','bunny',1,1,'start');
    this.#draw_asset('','add',1,1,'insert_first',this.#tile_height/2);
    let [y,w] = this.#iter(this.program,1,1);
    let hei = y * this.#tile_height * this.#scale_factor + this.#height_add;
    let wid = w * this.#tile_width * this.#scale_factor + this.#width_add;
    this.target.attr('height', hei);
    this.target.attr('width',  wid);
  }
}
