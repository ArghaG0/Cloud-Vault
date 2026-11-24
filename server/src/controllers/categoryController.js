const Document = require('../models/Document');

const DEFAULT_CATEGORIES = [
  { name: 'Lecture Notes', slug: 'lecture-notes', color: '#10B981', icon: 'menu_book', description: 'Course handouts, slide decks, and lecture recordings' },
  { name: 'Assignments', slug: 'assignments', color: '#3B82F6', icon: 'assignment', description: 'Homework submissions, lab reports, and coding tasks' },
  { name: 'Question Papers', slug: 'question-papers', color: '#F59E0B', icon: 'quiz', description: 'Past examination papers and sample question banks' },
  { name: 'Project Reports', slug: 'project-reports', color: '#8B5CF6', icon: 'article', description: 'Capstone documentation, whitepapers, and specs' },
  { name: 'Study Materials', slug: 'study-materials', color: '#EC4899', icon: 'library_books', description: 'Textbook chapters, cheatsheets, and summaries' },
  { name: 'Other Documents', slug: 'other-documents', color: '#6B7280', icon: 'folder', description: 'Administrative slips, transcripts, and misc files' },
];

// GET /api/categories
exports.getCategories = async (req, res) => {
  try {
    const userId = req.user._id;

    // Aggregate real document counts and bytes per category from MongoDB
    const agg = await Document.aggregate([
      { $match: { userId, isTrash: false, status: 'COMPLETED' } },
      {
        $group: {
          _id: '$category',
          count: { $sum: 1 },
          totalBytes: { $sum: '$fileSize' },
        },
      },
    ]);

    const countMap = {};
    const bytesMap = {};
    agg.forEach(item => {
      countMap[item._id] = item.count;
      bytesMap[item._id] = item.totalBytes;
    });

    const categoriesWithStats = DEFAULT_CATEGORIES.map(cat => ({
      ...cat,
      documentCount: countMap[cat.name] || 0,
      totalBytes: bytesMap[cat.name] || 0,
      sizeFormatted: ((bytesMap[cat.name] || 0) / (1024 * 1024)).toFixed(1) + ' MB',
    }));

    res.json({ success: true, data: categoriesWithStats });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};
