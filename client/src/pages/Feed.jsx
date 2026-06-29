import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import StoryBar from '../components/StoryBar';
import PostCard from '../components/PostCard';
import Loader from '../components/Loader';
import { fetchFeed } from '../utils/api';

export default function Feed() {
  const [posts, setPosts] = useState(null);

  const load = () => {
    fetchFeed()
      .then((r) => setPosts(r.posts))
      .catch((err) => {
        toast.error(err.message);
        setPosts([]);
      });
  };

  useEffect(() => {
    load();
  }, []);

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <StoryBar />
      {posts == null ? (
        <Loader label="Loading feed" />
      ) : posts.length === 0 ? (
        <p className="text-center text-sm text-[var(--text-muted)] py-12">
          Nothing in your feed yet.
        </p>
      ) : (
        posts.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04, duration: 0.3 }}
          >
            <PostCard post={p} onChange={load} />
          </motion.div>
        ))
      )}
    </div>
  );
}
