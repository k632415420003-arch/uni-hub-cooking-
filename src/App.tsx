import React, { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, MoreHorizontal, ChevronRight, MessageSquare, Send, Image as ImageIcon, ArrowLeft, X, Reply, Trash2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import ReactQuill from 'react-quill-new';
import { ContentItem, Comment } from './types';
import { INITIAL_DATA } from './constants';
import { db } from './firebase';
import { 
  collection, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  doc, 
  onSnapshot, 
  query, 
  orderBy,
  arrayUnion
} from 'firebase/firestore';

// --- Components ---

const Layout = ({ children }: { children: React.ReactNode }) => (
  <div className="min-h-screen bg-white font-sans text-gray-900 flex flex-col">
    <header className="border-b border-black py-4 px-6 flex justify-between items-center bg-white sticky top-0 z-50">
      <Link to="/" className="text-2xl font-bold tracking-widest uppercase">UNI-HUB</Link>
    </header>
    <main className="flex-1 w-full max-w-7xl mx-auto">
      {children}
    </main>
  </div>
);

const Sidebar = () => (
  <div className="w-full md:w-72 border-l border-black p-8 space-y-12 flex flex-col items-start text-left bg-white">
    <div className="space-y-0 w-full">
      <h2 className="text-7xl font-light tracking-tighter leading-none">uni</h2>
      <div className="w-full h-px bg-black my-4"></div>
      <h2 className="text-7xl font-light tracking-tighter leading-none">hub</h2>
    </div>
    <div className="text-xl space-y-8 italic font-light leading-snug text-gray-800">
      <p>nếu có góp ý hay công thức hay liên hệ với chúng tôi qua:</p>
      <div className="space-y-4 not-italic">
        <p className="italic"><span className="font-bold not-italic">email:</span> unihub@gmail.com</p>
        <p className="italic"><span className="font-bold not-italic">SĐT:</span> 0123456789</p>
        <p className="italic"><span className="font-bold not-italic">fanpage:</span> uni-hub-for-cooking</p>
        <p className="italic"><span className="font-bold not-italic">tiktok:</span> uni-hub-for-cooking</p>
      </div>
    </div>
  </div>
);

const CommentSection = ({ comments, onAddComment, onAddReply }: { 
  comments: Comment[], 
  onAddComment: (text: string, image?: string) => void,
  onAddReply: (commentId: string, text: string, image?: string) => void
}) => {
  const [text, setText] = useState('');
  const [image, setImage] = useState<string | undefined>(undefined);
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setImage(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!text.trim() && !image) return;
    if (replyTo) {
      onAddReply(replyTo, text, image);
    } else {
      onAddComment(text, image);
    }
    setText('');
    setImage(undefined);
    setReplyTo(null);
  };

  return (
    <div className="mt-12 space-y-6 pb-12">
      <h3 className="text-xl font-semibold italic">Bình luận</h3>
      
      {replyTo && (
        <div className="flex items-center gap-2 text-xs text-gray-500 bg-gray-50 p-2 rounded border-l-2 border-black">
          <Reply size={12} /> Đang trả lời bình luận...
          <button onClick={() => setReplyTo(null)} className="ml-auto hover:text-black"><X size={12} /></button>
        </div>
      )}

      <div className="space-y-2">
        {image && (
          <div className="relative w-20 h-20 border border-black rounded overflow-hidden">
            <img src={image} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            <button onClick={() => setImage(undefined)} className="absolute top-0 right-0 p-1 bg-white/80 hover:bg-white"><X size={12} /></button>
          </div>
        )}
        <div className="flex gap-2 border border-black p-2 rounded-lg items-center">
          <input 
            type="text" 
            placeholder={replyTo ? "Viết câu trả lời..." : "Viết cảm nhận của bạn"} 
            className="flex-1 outline-none px-2"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            className="p-1 hover:text-blue-600"
            title="Thêm ảnh"
          >
            <ImageIcon size={20} />
            <input type="file" ref={fileInputRef} className="hidden" accept="image/*" onChange={handleImageUpload} />
          </button>
          <button 
            onClick={handleSubmit}
            className="p-1 hover:text-blue-600"
          >
            <Send size={20} />
          </button>
        </div>
      </div>

      <div className="space-y-6">
        {comments.map(c => (
          <div key={c.id} className="space-y-3">
            <div className="flex items-start gap-3 group">
              <div className="w-8 h-8 rounded-full border border-black flex items-center justify-center text-xs font-bold shrink-0">U</div>
              <div className="flex-1 space-y-1">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm">Người dùng</span>
                  <button onClick={() => setReplyTo(c.id)} className="text-[10px] uppercase tracking-widest opacity-0 group-hover:opacity-100 hover:underline transition-opacity">Trả lời</button>
                </div>
                <p className="text-sm">{c.text}</p>
                {c.image && (
                  <div className="max-w-[200px] border border-black rounded overflow-hidden mt-2">
                    <img src={c.image} className="w-full h-auto" referrerPolicy="no-referrer" />
                  </div>
                )}
              </div>
            </div>
            {c.replies?.map(r => (
              <div key={r.id} className="ml-12 flex items-start gap-3 border-l border-black/10 pl-4 py-1">
                <div className="w-6 h-6 rounded-full border border-black flex items-center justify-center text-[10px] shrink-0">U</div>
                <div className="flex-1 space-y-1">
                  <span className="font-bold text-xs">Người dùng</span>
                  <p className="text-xs text-gray-600">{r.text}</p>
                  {r.image && (
                    <div className="max-w-[150px] border border-black/50 rounded overflow-hidden mt-2">
                      <img src={r.image} className="w-full h-auto" referrerPolicy="no-referrer" />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// --- Pages ---

const Home = ({ items }: { items: ContentItem[] }) => {
  const workshops = items.filter(i => i.type === 'workshop');
  const recipes = items.filter(i => i.type === 'recipe').slice(0, 6);

  return (
    <div className="p-6 space-y-12">
      {/* Workshop Section */}
      <section className="space-y-4 relative">
        <div className="flex justify-between items-end">
          <h2 className="text-3xl font-bold uppercase tracking-tighter">WORKSHOP</h2>
          <Link to="/add/workshop" className="p-2 border border-black rounded-full hover:bg-black hover:text-white transition-all">
            <Plus size={24} />
          </Link>
        </div>
        
        <div className="w-full overflow-x-auto pb-4 hide-scrollbar">
          <div className="flex gap-6 min-w-full">
            {workshops.length > 0 ? (
              workshops.map(ws => (
                <Link key={ws.id} to={`/detail/${ws.id}`} className="shrink-0 w-full md:w-[80%] aspect-video bg-gray-100 rounded-xl overflow-hidden border border-black relative group">
                  <img src={ws.images[0]} alt={ws.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" referrerPolicy="no-referrer" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-6">
                    <h3 className="text-white text-2xl font-light italic tracking-widest uppercase">{ws.title}</h3>
                  </div>
                </Link>
              ))
            ) : (
              <div className="w-full h-64 flex items-center justify-center text-gray-400 border border-black border-dashed rounded-xl">Chưa có workshop</div>
            )}
          </div>
        </div>

        <div className="flex justify-center gap-4 py-2">
          {workshops.map((_, i) => (
            <div key={i} className={`w-2 h-2 rounded-full ${i === 0 ? 'bg-black' : 'border border-black'}`}></div>
          ))}
        </div>
      </section>

      <div className="w-full h-px bg-black"></div>

      {/* Featured Recipes Section */}
      <section className="space-y-8">
        <div className="flex justify-between items-end">
          <h2 className="text-3xl font-bold uppercase tracking-tighter">CÔNG THỨC NỔI BẬT</h2>
          <Link to="/recipes" className="text-sm italic underline flex items-center gap-1 hover:text-gray-600">
            more <MoreHorizontal size={14} />
          </Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          {recipes.map(recipe => (
            <Link key={recipe.id} to={`/detail/${recipe.id}`} className="group">
              <div className="border border-black rounded-2xl overflow-hidden aspect-[4/5] flex flex-col">
                <div className="flex-1 bg-gray-50 overflow-hidden border-b border-black">
                  <img src={recipe.images[0]} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
                </div>
                <div className="p-4 bg-white">
                  <h3 className="text-xl font-light italic text-center uppercase tracking-tight">{recipe.title}</h3>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
};

const RecipeList = ({ items }: { items: ContentItem[] }) => {
  const recipes = items.filter(i => i.type === 'recipe');
  const [search, setSearch] = useState('');

  const filteredRecipes = recipes.filter(r => r.title.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="p-6 space-y-8">
      <div className="relative h-48 rounded-2xl overflow-hidden border border-black flex items-center justify-center">
        <img src="https://images.unsplash.com/photo-1543353071-873f17a7a088?auto=format&fit=crop&q=80&w=1200&h=400" className="absolute inset-0 w-full h-full object-cover" referrerPolicy="no-referrer" />
        <div className="absolute inset-0 bg-black/30"></div>
        <h1 className="relative text-6xl font-light tracking-[0.2em] uppercase italic text-white drop-shadow-lg">ẢNH ĐỒ ĂN</h1>
      </div>

      <div className="flex gap-2 max-w-xl mx-auto border border-black rounded-full px-4 py-2">
        <input 
          type="text" 
          placeholder="TÌM KIẾM CÔNG THỨC" 
          className="flex-1 outline-none text-sm tracking-widest"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <Search size={20} className="text-gray-400" />
      </div>

      <div className="flex justify-end">
        <Link to="/add/recipe" className="p-2 border border-black rounded-full hover:bg-black hover:text-white transition-all">
          <Plus size={24} />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
        {filteredRecipes.map(recipe => (
          <Link key={recipe.id} to={`/detail/${recipe.id}`} className="group">
            <div className="border border-black rounded-2xl overflow-hidden aspect-[4/5] flex flex-col">
              <div className="flex-1 bg-gray-50 overflow-hidden border-b border-black">
                <img src={recipe.images[0]} alt={recipe.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" referrerPolicy="no-referrer" />
              </div>
              <div className="p-4 bg-white">
                <h3 className="text-xl font-light italic text-center uppercase tracking-tight">{recipe.title}</h3>
              </div>
            </div>
          </Link>
        ))}
      </div>

      <div className="flex justify-center pt-8">
        <Link to="/" className="text-sm font-light tracking-widest uppercase flex items-center gap-2 hover:underline">
          WORKSHOP : more <ChevronRight size={16} />
        </Link>
      </div>
    </div>
  );
};

const DetailView = ({ items, onAddComment, onAddReply, onDelete }: { 
  items: ContentItem[], 
  onAddComment: (id: string, text: string, image?: string) => void,
  onAddReply: (itemId: string, commentId: string, text: string, image?: string) => void,
  onDelete: (id: string) => void
}) => {
  const { id } = useParams();
  const item = items.find(i => i.id === id);
  const navigate = useNavigate();
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletePassword, setDeletePassword] = useState('');

  if (!item) return <div className="p-12 text-center">Không tìm thấy nội dung</div>;

  const handleDelete = () => {
    if (deletePassword === 'TIN314') {
      onDelete(item.id);
      navigate('/');
    } else {
      alert('Sai mật khẩu!');
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-[calc(100vh-65px)] w-full overflow-x-hidden">
      <div className="flex-1 p-6 space-y-8 max-w-full overflow-x-hidden">
        <div className="flex justify-between items-center mb-4">
          <button onClick={() => navigate(-1)} className="flex items-center gap-2 text-sm hover:underline">
            <ArrowLeft size={16} /> Quay lại
          </button>
          
          <div className="relative">
            {!showDeleteConfirm ? (
              <button 
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center gap-2 text-xs text-red-500 hover:text-red-700 font-bold uppercase tracking-widest"
              >
                <Trash2 size={14} /> Xóa bài
              </button>
            ) : (
              <div className="flex items-center gap-2 bg-white border border-red-500 p-2 rounded-lg shadow-xl animate-in fade-in zoom-in duration-200">
                <input 
                  type="password" 
                  placeholder="Nhập mật khẩu..." 
                  className="text-xs border border-gray-300 px-2 py-1 rounded outline-none w-32"
                  value={deletePassword}
                  onChange={(e) => setDeletePassword(e.target.value)}
                  autoFocus
                />
                <button 
                  onClick={handleDelete}
                  className="text-[10px] bg-red-500 text-white px-2 py-1 rounded font-bold uppercase"
                >
                  Xác nhận
                </button>
                <button 
                  onClick={() => { setShowDeleteConfirm(false); setDeletePassword(''); }}
                  className="text-[10px] text-gray-500 hover:text-black"
                >
                  Hủy
                </button>
              </div>
            )}
          </div>
        </div>
        
        {/* Images Grid - Smaller Layout */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {item.images.map((img, idx) => (
            <div key={idx} className="aspect-square rounded-xl overflow-hidden border border-black/10 bg-gray-50 shadow-sm flex items-center justify-center">
              <img src={img} alt={`${item.title} ${idx + 1}`} className="max-w-full max-h-full object-contain hover:scale-110 transition-transform duration-500" referrerPolicy="no-referrer" />
            </div>
          ))}
        </div>

        <div className="space-y-6 overflow-x-hidden max-w-full">
          <h1 className="text-4xl font-light tracking-widest uppercase italic text-gray-400 break-words">TITLE: {item.title}</h1>
          <div 
            className="prose-none max-w-full font-light italic leading-relaxed rich-text-content break-words overflow-x-hidden"
            dangerouslySetInnerHTML={{ __html: item.content }}
          />
        </div>

        <CommentSection 
          comments={item.comments} 
          onAddComment={(text, image) => onAddComment(item.id, text, image)} 
          onAddReply={(commentId, text, image) => onAddReply(item.id, commentId, text, image)}
        />
      </div>
      <Sidebar />
    </div>
  );
};

const AddEditForm = ({ onSave }: { onSave: (item: Omit<ContentItem, 'id' | 'comments' | 'createdAt'>) => void }) => {
  const { type } = useParams();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [password, setPassword] = useState('');

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImages([...images, reader.result as string]);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = () => {
    if (!title || !content) {
      alert('Vui lòng nhập đủ thông tin');
      return;
    }
    if (password !== 'TIN314') {
      alert('Sai mật khẩu! Không thể lưu bài.');
      return;
    }
    onSave({
      type: (type as 'workshop' | 'recipe') || 'recipe',
      title,
      content,
      images: images.length > 0 ? images : ['https://picsum.photos/seed/placeholder/400/300'],
    });
    navigate('/');
  };

  const modules = {
    toolbar: [
      [{ 'header': [1, 2, false] }],
      ['bold', 'italic', 'underline'],
      [{ 'size': ['small', false, 'large', 'huge'] }],
      [{ 'align': [] }],
      ['clean']
    ],
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-12">
      <h1 className="text-3xl font-light tracking-[0.3em] uppercase text-center border-b border-black pb-4">UPDATE THÔNG TIN</h1>
      
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <label className="text-xl font-light tracking-widest uppercase italic text-gray-400 shrink-0">TITLE:</label>
          <input 
            type="text" 
            className="flex-1 border border-black rounded px-3 py-1 outline-none"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>

        <div className="space-y-4">
          <label className="text-xl font-light tracking-widest uppercase italic text-gray-400">ẢNH:</label>
          <div className="grid grid-cols-5 gap-4">
            {images.map((img, idx) => (
              <div key={idx} className="aspect-square border border-black rounded-lg overflow-hidden relative group">
                <img src={img} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                <button onClick={() => setImages(images.filter((_, i) => i !== idx))} className="absolute top-1 right-1 p-1 bg-white/80 rounded opacity-0 group-hover:opacity-100 transition-opacity"><X size={12}/></button>
              </div>
            ))}
            <label className="aspect-square border border-black rounded-lg flex items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors">
              <Plus size={32} className="text-gray-300" />
              <input type="file" className="hidden" accept="image/*" onChange={handleImageUpload} />
            </label>
          </div>
        </div>

        <div className="space-y-4">
          <label className="text-xl font-light tracking-widest uppercase italic text-gray-400">Nội dung</label>
          <div className="border border-black rounded-2xl overflow-hidden bg-white min-h-[400px]">
            <ReactQuill 
              theme="snow" 
              value={content} 
              onChange={setContent} 
              modules={modules}
              placeholder="Viết nội dung như MS Word tại đây..."
              className="h-[350px]"
            />
          </div>
        </div>

        <div className="space-y-4 pt-8">
          <label className="text-xl font-light tracking-widest uppercase italic text-gray-400">Xác nhận mật khẩu</label>
          <input 
            type="password" 
            placeholder="Nhập mật khẩu để lưu bài viết" 
            className="w-full border border-black rounded px-4 py-2 outline-none text-center"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="flex justify-center gap-4">
          <button 
            onClick={handleSubmit}
            className="px-12 py-3 border border-black rounded-full hover:bg-black hover:text-white transition-all shadow-lg font-bold tracking-widest uppercase"
          >
            LƯU
          </button>
        </div>
      </div>
    </div>
  );
};

// --- Main App ---

export default function App() {
  const [items, setItems] = useState<ContentItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const q = query(collection(db, 'items'), orderBy('createdAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems = snapshot.docs.map(doc => ({
        ...doc.data(),
        id: doc.id,
      })) as ContentItem[];
      setItems(fetchedItems);
      setLoading(false);
    }, (error) => {
      console.error("Firestore Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const handleAddItem = async (newItem: Omit<ContentItem, 'id' | 'comments' | 'createdAt'>) => {
    try {
      await addDoc(collection(db, 'items'), {
        ...newItem,
        comments: [],
        createdAt: Date.now(),
      });
    } catch (error) {
      console.error("Error adding item:", error);
      alert("Lỗi khi đăng bài. Vui lòng thử lại.");
    }
  };

  const handleAddComment = async (itemId: string, text: string, image?: string) => {
    try {
      const itemRef = doc(db, 'items', itemId);
      const newComment = { 
        id: Date.now().toString(), 
        author: 'Người dùng', 
        text, 
        image: image || null 
      };
      await updateDoc(itemRef, {
        comments: arrayUnion(newComment)
      });
    } catch (error) {
      console.error("Error adding comment:", error);
    }
  };

  const handleAddReply = async (itemId: string, commentId: string, text: string, image?: string) => {
    try {
      const item = items.find(i => i.id === itemId);
      if (!item) return;

      const updatedComments = item.comments.map(c => {
        if (c.id === commentId) {
          return {
            ...c,
            replies: [
              ...(c.replies || []),
              { id: Date.now().toString(), author: 'Người dùng', text, image: image || null }
            ]
          };
        }
        return c;
      });

      const itemRef = doc(db, 'items', itemId);
      await updateDoc(itemRef, {
        comments: updatedComments
      });
    } catch (error) {
      console.error("Error adding reply:", error);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await deleteDoc(doc(db, 'items', itemId));
    } catch (error) {
      console.error("Error deleting item:", error);
      alert("Lỗi khi xóa bài.");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-2xl font-light tracking-[0.3em] animate-pulse uppercase italic">UNI-HUB LOADING...</div>
      </div>
    );
  }

  return (
    <Router>
      <Layout>
        <Routes>
          <Route path="/" element={<Home items={items} />} />
          <Route path="/recipes" element={<RecipeList items={items} />} />
          <Route path="/detail/:id" element={<DetailView items={items} onAddComment={handleAddComment} onAddReply={handleAddReply} onDelete={handleDeleteItem} />} />
          <Route path="/add/:type" element={<AddEditForm onSave={handleAddItem} />} />
        </Routes>
      </Layout>
    </Router>
  );
}
