import { Link } from 'react-router-dom';
import { POSTS } from './posts';
import './Blog.css';

export default function Blog() {
    return (
        <div className="content blog-page">
            <div className="eyebrow">Blog</div>
            <h1 className="page-title">Notes from the atlas</h1>
            <p className="page-sub">
                How each visualization is sourced, built, and verified.
            </p>
            <div className="post-list">
                {POSTS.map((post) => (
                    <Link key={post.slug} to={`/blog/${post.slug}`} className="post-item">
                        <div className="post-date">
                            {post.date} · {post.readingMinutes} min
                        </div>
                        <h2>{post.title}</h2>
                        <p>{post.summary}</p>
                        <span className="text-link">
                            Read <span className="chev">›</span>
                        </span>
                    </Link>
                ))}
            </div>
        </div>
    );
}
